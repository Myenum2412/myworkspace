import { AIProviderFactory } from "../providers/ai-provider.factory.js";
import type { AIProvider, GenerationOptions } from "../providers/ai-provider.interface.js";
import type { AgentMessage, ToolCall } from "../types/message.types.js";
import type { AgentConfig, AgentRunResult, TurnLog, AgentError } from "../types/agent.types.js";
import type { ConversationSession } from "../types/memory.types.js";
import { ToolRegistry } from "../tools/registry.js";
import { ToolApproval } from "../tools/approval.js";
import { MemoryManager } from "../memory/memory-manager.js";
import { enhancedMemoryManager } from "../memory/enhanced-memory-manager.js";
import { MessageIngestor } from "../pipeline/message-ingestor.js";
import { PromptBuilder } from "../pipeline/prompt-builder.js";
import { ResponseHandler, type ResponseCallbacks } from "../pipeline/response-handler.js";
import { orchestrator } from "./orchestrator.js";
import { PlannerAgent } from "./planner-agent.js";
import { aiLogger } from "../logging/ai-logger.js";
import { AGENT_CONFIG } from "./agent-config.js";
import { AI_CONFIG } from "../config.js";
import { Settings } from "../../../lib/db/models/Settings.js";
import { Organization } from "../../../lib/db/models/Organization.js";
import { logger } from "../../../lib/logger/index.js";

export interface AgentRequest {
  userId: string;
  sessionId: string;
  message: string;
  organizationId?: string;
  customerName?: string;
  customerPhone?: string;
  stream?: boolean;
  callbacks?: ResponseCallbacks;
  signal?: AbortSignal;
  enabledToolsets?: string[];
  disabledToolsets?: string[];
  useOrchestrator?: boolean;
}

export interface AgentResponse {
  reply: string;
  sessionId: string;
  turnCount: number;
  tokensUsed: number;
  durationMs: number;
  toolCalls: number;
  intent: string;
  language: string;
}

export class AIAgent {
  private provider: AIProvider;
  private toolRegistry: ToolRegistry;
  private memoryManager: MemoryManager;
  private messageIngestor: MessageIngestor;
  private promptBuilder: PromptBuilder;
  private responseHandler: ResponseHandler;
  private planner: PlannerAgent;
  private config: AgentConfig;

  constructor() {
    this.provider = AIProviderFactory.getProviderWithFallback();
    this.toolRegistry = ToolRegistry.getInstance();
    this.memoryManager = MemoryManager.getInstance();
    this.messageIngestor = new MessageIngestor();
    this.promptBuilder = new PromptBuilder();
    this.responseHandler = new ResponseHandler();
    this.planner = new PlannerAgent();
    this.config = {
      maxTurns: AGENT_CONFIG.maxTurns,
      maxToolIterations: AGENT_CONFIG.maxToolIterations,
      contextCompressionThreshold: AGENT_CONFIG.contextCompressionThreshold,
      contextCompressionTargetRatio: AGENT_CONFIG.contextCompressionTargetRatio,
      protectLastNMessages: AGENT_CONFIG.protectLastNMessages,
      enableStreaming: AGENT_CONFIG.enableStreaming,
      enableMemory: AGENT_CONFIG.enableMemory,
      enableSelfReview: AGENT_CONFIG.enableSelfReview,
      selfReviewInterval: AGENT_CONFIG.selfReviewInterval,
    };
  }

  async run(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const { userId, sessionId, message, organizationId } = request;

    aiLogger.startSession(sessionId, userId, organizationId);

    try {
      if (AI_CONFIG.enableEnhancedMemory) {
        await enhancedMemoryManager.initialize();
      }

      await this.toolRegistry.initializeBuiltInTools();

      const useOrch = request.useOrchestrator !== false && AI_CONFIG.enableMultiAgent;

      if (useOrch) {
        return await this.runWithOrchestration(request, startTime);
      }

      return await this.runStandard(request, startTime);
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const errMsg = error instanceof Error ? error.message : String(error);
      const agentError: AgentError = {
        code: error instanceof Error ? error.name : "UNKNOWN",
        message: errMsg,
        recoverable: false,
      };

      aiLogger.logError(sessionId, userId, agentError);
      logger.error({ error: errMsg, userId, sessionId }, "AIAgent fatal error");

      return {
        reply: "",
        sessionId,
        turnCount: 0,
        tokensUsed: 0,
        durationMs,
        toolCalls: 0,
        intent: "unknown",
        language: AI_CONFIG.defaultLanguage,
      };
    }
  }

  private async runWithOrchestration(request: AgentRequest, startTime: number): Promise<AgentResponse> {
    logger.info({ sessionId: request.sessionId, userId: request.userId }, "Running with multi-agent orchestration");

    const result = await orchestrator.processWithOrchestration(
      request.message,
      request.sessionId,
      request.userId,
      request.organizationId
    );

    const durationMs = Date.now() - startTime;

    return {
      reply: result.response,
      sessionId: request.sessionId,
      turnCount: result.plan.steps.length,
      tokensUsed: result.results.reduce((s, r) => s + r.tokenUsage, 0),
      durationMs,
      toolCalls: result.results.length,
      intent: "multi_agent",
      language: "en",
    };
  }

  private async runStandard(request: AgentRequest, startTime: number): Promise<AgentResponse> {
    const { userId, sessionId, message, organizationId } = request;

    const { session, messages } = await this.memoryManager.loadContextForSession(
      sessionId, userId, organizationId
    );

    let ragContext = "";
    if (AI_CONFIG.enableRag) {
      try {
        ragContext = await enhancedMemoryManager.getRelevantContext(userId, message, 5);
      } catch {
        // Non-critical
      }
    }

    const ingested = await this.messageIngestor.ingest(
      { text: message, userId, sessionId, organizationId },
      messages
    );

    const volatileBlock = await this.memoryManager.assembleSystemPromptVolatile(userId);
    const toolDefs = this.toolRegistry.getDefinitions(
      request.enabledToolsets,
      request.disabledToolsets
    );

    const soul = await this.loadSoul(organizationId);
    const orgContext = await this.loadOrgContext(organizationId);

    const contextParts = [orgContext, ragContext, volatileBlock].filter(Boolean);
    const systemPrompt = this.promptBuilder.buildSystemPrompt(
      contextParts.join("\n\n"),
      toolDefs,
      soul
    );

    let apiMessages = this.promptBuilder.buildApiMessages(
      systemPrompt,
      messages,
      ingested.normalizedText
    );

    if (AI_CONFIG.enablePlanning) {
      const plan = await this.planner.createPlan(message, toolDefs.map((t) => t.name));
      const thinkingBlock = `[Planning]\nGoal: ${plan.goal}\nReasoning: ${plan.reasoning}\nSteps: ${plan.steps.map((s) => `- ${s.description} (${s.agent})`).join("\n")}`;
      apiMessages = [
        { role: "system", content: systemPrompt },
        { role: "assistant", content: thinkingBlock },
        ...apiMessages.slice(2),
      ];
    }

    const turnLogs: TurnLog[] = [];
    let toolIterationCount = 0;
    let totalTokens = 0;
    let finalContent = "";

    const userMsg: AgentMessage = { role: "user", content: ingested.normalizedText, timestamp: new Date() };
    await this.memoryManager.getSessionManager().addMessage(sessionId, userMsg);

    const generationOptions: GenerationOptions = {
      temperature: AI_CONFIG.temperature,
      maxTokens: AI_CONFIG.maxTokens,
      tools: toolDefs,
      toolChoice: toolDefs.length > 0 ? "auto" : "none",
      signal: request.signal,
    };

    if (request.stream && AGENT_CONFIG.enableStreaming) {
      generationOptions.stream = true;
      generationOptions.onStreamChunk = request.callbacks?.onStreamChunk;
    }

    while (toolIterationCount < this.config.maxToolIterations) {
      const turnStart = Date.now();
      request.callbacks?.onStatus?.("thinking");

      let toolCallsInTurn: TurnLog["toolCalls"] = [];

      apiMessages = this.maybeCompressContext(apiMessages, session);
      await this.memoryManager.getSessionManager().updateMetadata(sessionId, {
        tokenCount: totalTokens,
        lastIntent: ingested.intent.intent,
      });

      let response;
      try {
        response = await this.provider.generateResponse(apiMessages, {
          ...generationOptions,
          tools: toolDefs,
        });
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        const agentError: AgentError = {
          code: "API_ERROR",
          message: errMsg,
          recoverable: toolIterationCount < 2,
          retryAfter: toolIterationCount < 2 ? 1000 : undefined,
        };

        aiLogger.logError(sessionId, userId, agentError);

        if (toolIterationCount < 2) {
          toolIterationCount++;
          await this.delay(1000);
          continue;
        }

        finalContent = "";
        break;
      }

      totalTokens += response.tokensUsed;
      const turnDuration = Date.now() - turnStart;

      let parsedContent = response.content;
      let toolCalls: ToolCall[] = [];

      try {
        const parsed = JSON.parse(response.content);
        if (parsed.tool_calls && Array.isArray(parsed.tool_calls)) {
          parsedContent = parsed.content || "";
          toolCalls = parsed.tool_calls;
        }
      } catch {
        parsedContent = response.content;
      }

      if (toolCalls.length > 0) {
        request.callbacks?.onStatus?.("executing_tool");

        for (const tc of toolCalls) {
          const toolStartTime = Date.now();
          let args: Record<string, unknown> = {};

          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = {};
          }

          request.callbacks?.onToolCall?.(tc.function.name, args);

          const approval = ToolApproval.checkDangerousOperation(tc.function.name, args);
          if (approval.requiresApproval) {
            aiLogger.logToolCall(sessionId, tc.function.name, args, 0, false);
            toolCallsInTurn.push({
              toolName: tc.function.name,
              arguments: args,
              result: {
                success: false,
                output: `Operation blocked: ${approval.reason}`,
                error: approval.reason,
                durationMs: 0,
              },
              timestamp: new Date(),
            });
            continue;
          }

          const result = await this.toolRegistry.execute(tc.function.name, args, {
            userId,
            organizationId,
          });

          const toolDuration = Date.now() - toolStartTime;
          aiLogger.logToolCall(sessionId, tc.function.name, args, toolDuration, result.success);

          toolCallsInTurn.push({
            toolName: tc.function.name,
            arguments: args,
            result,
            timestamp: new Date(),
          });

          const toolResultMsg: AgentMessage = {
            role: "tool",
            tool_call_id: tc.id,
            content: result.success
              ? this.responseHandler.formatToolResult(tc.function.name, result.output, toolDuration)
              : this.responseHandler.formatToolError(tc.function.name, result.error || "Unknown error"),
            name: tc.function.name,
          };

          apiMessages.push({
            role: "assistant",
            content: parsedContent,
            tool_calls: [tc],
          });
          apiMessages.push(toolResultMsg);
        }

        toolIterationCount++;
        const turnLog: TurnLog = {
          turnNumber: turnLogs.length + 1,
          userMessage: ingested.normalizedText,
          intent: ingested.intent,
          systemPrompt: systemPrompt.substring(0, 200),
          assistantResponse: parsedContent,
          toolCalls: toolCallsInTurn,
          tokensUsed: response.tokensUsed,
          durationMs: turnDuration,
          compressed: false,
        };
        turnLogs.push(turnLog);
        aiLogger.logTurn(turnLog);

        continue;
      }

      const turnLogFinal: TurnLog = {
        turnNumber: turnLogs.length + 1,
        userMessage: ingested.normalizedText,
        intent: ingested.intent,
        systemPrompt: systemPrompt.substring(0, 200),
        assistantResponse: parsedContent,
        toolCalls: toolCallsInTurn,
        tokensUsed: response.tokensUsed,
        durationMs: turnDuration,
        compressed: false,
      };
      turnLogs.push(turnLogFinal);
      aiLogger.logTurn(turnLogFinal);

      finalContent = parsedContent;

      const assistantMsg: AgentMessage = { role: "assistant", content: finalContent, timestamp: new Date() };
      await this.memoryManager.getSessionManager().addMessage(sessionId, assistantMsg);

      break;
    }

    if (toolIterationCount >= this.config.maxToolIterations) {
      finalContent = finalContent || "";
    }

    const memoryUpdates = await this.memoryManager.afterTurn(
      userId, sessionId, message, finalContent
    );

    await this.memoryManager.getSessionManager().updateMetadata(sessionId, {
      tokenCount: totalTokens,
    });

    const durationMs = Date.now() - startTime;

    if (AI_CONFIG.enableEnhancedMemory && finalContent) {
      try {
        await enhancedMemoryManager.storeEpisode(userId, `User: ${message}\nAssistant: ${finalContent}`, {
          sessionId,
          source: "conversation",
          tags: [ingested.intent.intent],
        });
      } catch {
        // Non-critical
      }
    }

    const result: AgentRunResult = {
      response: finalContent,
      turnLogs,
      session: await this.memoryManager.getSessionManager()
        .getOrCreateSession(sessionId, userId, organizationId),
      memoryUpdates,
      durationMs,
      tokensUsed: totalTokens,
    };

    aiLogger.endSession(sessionId, userId, result);

    const formattedResponse = await this.responseHandler.formatResponse(finalContent, request.callbacks);

    return {
      reply: formattedResponse.text,
      sessionId,
      turnCount: turnLogs.length,
      tokensUsed: totalTokens,
      durationMs,
      toolCalls: turnLogs.reduce((sum, t) => sum + t.toolCalls.length, 0),
      intent: ingested.intent.intent,
      language: ingested.language,
    };
  }

  private async loadSoul(orgId?: string): Promise<string> {
    try {
      if (!orgId) return "";
      const settings = await Settings.findOne({ orgId }).lean();
      return settings?.aiSoul || "";
    } catch {
      return "";
    }
  }

  private async loadOrgContext(orgId?: string): Promise<string> {
    try {
      if (!orgId) return "";
      const org = await Organization.findOne({ id: orgId }).lean();
      if (!org) return "";
      const parts: string[] = [];
      if (org.name) parts.push(`Company Name: ${org.name}`);
      if (org.companyDescription) parts.push(`Company Description: ${org.companyDescription}`);
      if (org.industry) parts.push(`Industry: ${org.industry}`);
      if (parts.length === 0) return "";
      return `## Organization Context\n${parts.join("\n")}`;
    } catch {
      return "";
    }
  }

  private maybeCompressContext(messages: AgentMessage[], session: ConversationSession): AgentMessage[] {
    const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
    if (!session) return messages;

    if (totalChars > AI_CONFIG.maxTokens * 2) {
      logger.debug({ messageCount: messages.length, totalChars }, "Context compression threshold reached");
      const protectedMsgs = messages.slice(-this.config.protectLastNMessages);
      const compressibleMsgs = messages.slice(0, -this.config.protectLastNMessages);

      if (compressibleMsgs.length > 5) {
        const summary = `[Previous conversation context with ${compressibleMsgs.length} messages compressed for token efficiency]`;
        const compressed = [
          { role: "system" as const, content: summary },
          ...protectedMsgs,
        ];
        aiLogger.logContextCompression(
          session.sessionId,
          messages.length,
          compressed.length
        );
        return compressed;
      }
    }

    return messages;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
