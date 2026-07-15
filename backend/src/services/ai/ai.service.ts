import { getAIProvider } from "./ai-factory.js";
import { ContextManager } from "./context-manager.service.js";
import { PromptBuilder } from "./prompt-builder.service.js";
import { ConversationService } from "./conversation.service.js";
import { FileProcessor } from "./file-processor.service.js";
import { RateLimiter } from "./rate-limiter.service.js";
import { TokenCounter } from "./token-counter.service.js";
import { CostCalculator } from "./cost-calculator.service.js";
import { AIAuditLogger } from "./audit-logger.service.js";
import { AiSettings } from "../../lib/db/models/AiSettings.js";
import { env } from "../../config/env.js";
import type {
  AIProvider,
  AIProviderConfig,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from "./types.js";
import { AppError } from "../../middleware/error.js";

export class AIService {
  private contextManager: ContextManager;
  private promptBuilder: PromptBuilder;
  private conversationService: ConversationService;
  private fileProcessor: FileProcessor;
  private rateLimiter: RateLimiter;
  private tokenCounter: TokenCounter;
  private costCalculator: CostCalculator;
  private auditLogger: AIAuditLogger;

  constructor() {
    this.contextManager = new ContextManager();
    this.promptBuilder = new PromptBuilder();
    this.conversationService = new ConversationService();
    this.fileProcessor = new FileProcessor();
    this.rateLimiter = new RateLimiter();
    this.tokenCounter = new TokenCounter();
    this.costCalculator = new CostCalculator();
    this.auditLogger = new AIAuditLogger();
  }

  async getSettings(orgId: string): Promise<AIProviderConfig> {
    const settings = await AiSettings.findOne({ orgId });
    if (!settings) {
      return {
        apiKey: process.env.OPENROUTER_API_KEY || "",
        model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
        temperature: 0.7,
        maxTokens: 4096,
        responseLength: "medium",
        systemPrompt: "You are an expert AI assistant for workspace management and structural detailing.",
        streamingEnabled: true,
      };
    }

    const apiKey = this.getApiKey(settings.provider);

    return {
      apiKey,
      model: settings.aiModel,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      responseLength: settings.responseLength,
      systemPrompt: settings.systemPrompt,
      streamingEnabled: settings.streamingEnabled,
    };
  }

  private getApiKey(provider: AIProvider): string {
    switch (provider) {
      case "openrouter": return process.env.OPENROUTER_API_KEY || "";
      case "openai": return process.env.OPENAI_API_KEY || "";
      case "claude": return process.env.ANTHROPIC_API_KEY || "";
      case "azure": return process.env.AZURE_OPENAI_API_KEY || "";
      default: return "";
    }
  }

  async chat(params: {
    orgId: string;
    userId: string;
    conversationId?: string;
    prompt: string;
    context: "workspace" | "staff";
    workspaceContext?: Record<string, unknown>;
    files?: Array<{ name: string; type: string; size: number; url?: string }>;
    streaming?: boolean;
    ip?: string;
    userAgent?: string;
  }): Promise<{
    response: AICompletionResponse | AsyncGenerator<AIStreamChunk>;
    conversationId: string;
  }> {
    const { orgId, userId, conversationId, prompt, context, workspaceContext, files, streaming, ip, userAgent } = params;

    this.validatePrompt(prompt);

    await this.rateLimiter.check(orgId, userId);

    const settings = await this.getSettings(orgId);
    const providerName = (await AiSettings.findOne({ orgId }))?.provider || "openrouter";
    const provider = getAIProvider(providerName as AIProvider);

    if (!provider.validateConfig()) {
      throw new AppError(500, `AI provider "${providerName}" is not configured. Check your API key.`);
    }

    let convId = conversationId;
    if (!convId) {
      const conv = await this.conversationService.create({
        orgId,
        userId,
        title: prompt.slice(0, 100),
        context,
        workspaceContext,
      });
      convId = conv._id.toString();
    }
    const cid: string = convId;

    const contextData = await this.contextManager.buildContext({
      orgId,
      userId,
      context,
      workspaceContext,
    });

    const fileContents = files?.length
      ? await this.fileProcessor.processFiles(files)
      : [];

    const history = await this.conversationService.getHistory(cid);

    const messages = this.promptBuilder.build({
      prompt,
      contextData,
      fileContents,
      history,
      systemPrompt: settings.systemPrompt,
    });

    const request: AICompletionRequest = {
      messages,
      config: settings,
      context: contextData as unknown as Record<string, unknown>,
    };

    const start = Date.now();

    try {
      if (streaming) {
        const streamGen = this.streamResponse(provider, request, {
          orgId,
          userId,
          convId: cid,
          prompt,
          providerName: providerName as AIProvider,
          files,
          ip,
          userAgent,
        });

        return { response: streamGen, conversationId: cid };
      }

      const response = await provider.complete(request);
      const executionTime = Date.now() - start;

      await this.conversationService.addMessage(cid, {
        orgId,
        userId,
        role: "user",
        content: prompt,
        files,
      });

      await this.conversationService.addMessage(cid, {
        orgId,
        userId,
        role: "assistant",
        content: response.content,
        responseId: response.responseId,
        aiModel: response.model,
        tokens: response.tokens,
        executionTime,
      });

      await this.conversationService.updateTokenCount(cid, response.tokens.total);
      await this.conversationService.updateLastActivity(cid);

      await this.auditLogger.log({
        orgId,
        userId,
        action: "chat",
        prompt,
        responseId: response.responseId,
        model: response.model,
        tokens: response.tokens,
        executionTime,
        files: files?.map(f => f.name),
        ip,
        userAgent,
        status: "success",
      });

      return { response, conversationId: convId };
    } catch (err: any) {
      const executionTime = Date.now() - start;

      await this.auditLogger.log({
        orgId,
        userId,
        action: "chat",
        prompt,
        model: providerName as AIProvider,
        executionTime,
        files: files?.map(f => f.name),
        ip,
        userAgent,
        status: "failure",
        error: err.message,
      });

      throw err;
    }
  }

  private async *streamResponse(
    provider: ReturnType<typeof getAIProvider>,
    request: AICompletionRequest,
    meta: {
      orgId: string;
      userId: string;
      convId: string;
      prompt: string;
      providerName: AIProvider;
      files?: Array<{ name: string; type: string; size: number; url?: string }>;
      ip?: string;
      userAgent?: string;
    }
  ): AsyncGenerator<AIStreamChunk> {
    const start = Date.now();
    let fullContent = "";
    let finalTokens = { prompt: 0, completion: 0, total: 0 };
    let responseId = "";

    try {
      const stream = provider.stream(request);

      for await (const chunk of stream) {
        if (chunk.done) {
          finalTokens = chunk.tokens || finalTokens;
          responseId = chunk.responseId || responseId;
          break;
        }
        fullContent += chunk.content;
        yield chunk;
      }

      const executionTime = Date.now() - start;

      await this.conversationService.addMessage(meta.convId, {
        orgId: meta.orgId,
        userId: meta.userId,
        role: "user",
        content: meta.prompt,
        files: meta.files,
      });

      await this.conversationService.addMessage(meta.convId, {
        orgId: meta.orgId,
        userId: meta.userId,
        role: "assistant",
        content: fullContent,
        responseId,
        aiModel: request.config.model,
        tokens: finalTokens,
        executionTime,
      });

      await this.conversationService.updateTokenCount(meta.convId, finalTokens.total);
      await this.conversationService.updateLastActivity(meta.convId);

      await this.auditLogger.log({
        orgId: meta.orgId,
        userId: meta.userId,
        action: "chat_stream",
        prompt: meta.prompt,
        responseId,
        model: request.config.model,
        tokens: finalTokens,
        executionTime,
        files: meta.files?.map(f => f.name),
        ip: meta.ip,
        userAgent: meta.userAgent,
        status: "success",
      });

      yield {
        content: "",
        done: true,
        responseId,
        tokens: finalTokens,
      };
    } catch (err: any) {
      const executionTime = Date.now() - start;

      await this.auditLogger.log({
        orgId: meta.orgId,
        userId: meta.userId,
        action: "chat_stream",
        prompt: meta.prompt,
        model: request.config.model,
        executionTime,
        files: meta.files?.map(f => f.name),
        ip: meta.ip,
        userAgent: meta.userAgent,
        status: "failure",
        error: err.message,
      });

      yield {
        content: "",
        done: true,
      };
    }
  }

  async quickAction(params: {
    orgId: string;
    userId: string;
    action: string;
    prompt?: string;
    context: "workspace" | "staff";
    workspaceContext?: Record<string, unknown>;
  }): Promise<AICompletionResponse> {
    const actionPrompts: Record<string, string> = {
      summarize: "Please summarize the following content concisively:",
      improve_writing: "Please improve the writing quality of the following:",
      rewrite_professional: "Please rewrite the following in a professional tone:",
      translate: "Please translate the following content:",
      explain: "Please explain the following in simple terms:",
      simplify: "Please simplify the following content:",
      expand: "Please expand on the following with more detail:",
      shorten: "Please shorten the following while keeping key points:",
      generate_checklist: "Please generate a checklist based on the following:",
      generate_report: "Please generate a comprehensive report based on the following:",
      create_email: "Please draft a professional email based on the following:",
      create_meeting_notes: "Please create meeting notes from the following:",
      generate_tasks: "Please generate a list of actionable tasks from the following:",
      find_risks: "Please identify potential risks in the following:",
      create_sop: "Please create a standard operating procedure based on the following:",
      create_documentation: "Please create technical documentation from the following:",
    };

    const actionPrompt = actionPrompts[params.action] || "Please process the following:";
    const fullPrompt = `${actionPrompt}\n\n${params.prompt || ""}`;

    const result = await this.chat({
      orgId: params.orgId,
      userId: params.userId,
      prompt: fullPrompt,
      context: params.context,
      workspaceContext: params.workspaceContext,
      streaming: false,
    });

    return result.response as AICompletionResponse;
  }

  async regenerate(conversationId: string, orgId: string, userId: string): Promise<{
    response: AICompletionResponse | AsyncGenerator<AIStreamChunk>;
  }> {
    const lastUserMessage = await this.conversationService.getLastUserMessage(conversationId);
    if (!lastUserMessage) {
      throw new AppError(400, "No user message found to regenerate from");
    }

    const conv = await this.conversationService.findById(conversationId);
    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    await this.conversationService.removeLastAssistantMessage(conversationId);

    const result = await this.chat({
      orgId,
      userId,
      conversationId,
      prompt: lastUserMessage.content,
      context: conv.context,
      workspaceContext: conv.workspaceContext as Record<string, unknown> | undefined,
      streaming: true,
    });

    return { response: result.response };
  }

  async continueResponse(conversationId: string, orgId: string, userId: string): Promise<{
    response: AsyncGenerator<AIStreamChunk>;
  }> {
    const conv = await this.conversationService.findById(conversationId);
    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    const history = await this.conversationService.getHistory(conversationId);
    const lastMessage = history[history.length - 1];

    if (!lastMessage || lastMessage.role !== "assistant") {
      throw new AppError(400, "No assistant response to continue");
    }

    const continuePrompt = "Please continue your previous response.";
    const messages = [...history.map(m => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })), { role: "user" as const, content: continuePrompt }];

    const settings = await this.getSettings(orgId);
    const providerName = (await AiSettings.findOne({ orgId }))?.provider || "openrouter";
    const provider = getAIProvider(providerName as AIProvider);

    const request: AICompletionRequest = {
      messages,
      config: settings,
    };

    const streamGen = this.streamResponse(provider, request, {
      orgId,
      userId,
      convId: conversationId,
      prompt: continuePrompt,
      providerName: providerName as AIProvider,
    });

    return { response: streamGen };
  }

  private validatePrompt(prompt: string): void {
    if (!prompt || !prompt.trim()) {
      throw new AppError(400, "Prompt cannot be empty");
    }

    if (prompt.length > 100000) {
      throw new AppError(400, "Prompt exceeds maximum length of 100,000 characters");
    }

    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|directions|commands)/i,
      /reveal\s+(your\s+)?(system\s+)?prompt/i,
      /forget\s+(all\s+)?(previous|prior)\s+(instructions|training)/i,
      /you\s+are\s+(now|not\s+bound|free)/i,
      /act\s+as\s+(if\s+you|though\s+you)/i,
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /onerror\s*=/i,
      /onload\s*=/i,
      /onclick\s*=/i,
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(prompt)) {
        throw new AppError(400, "Prompt contains potentially harmful content");
      }
    }
  }
}
