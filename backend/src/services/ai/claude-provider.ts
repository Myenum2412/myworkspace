import Anthropic from "@anthropic-ai/sdk";
import { IAIProvider } from "./base-provider.js";
import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from "./types.js";

export class ClaudeProvider implements IAIProvider {
  name = "claude";
  private client: Anthropic | null = null;
  private apiKey: string = "";

  private getClient(): Anthropic {
    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    if (!this.client || this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  validateConfig(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const client = this.getClient();

    const systemMessage = request.messages.find(m => m.role === "system");
    const chatMessages = request.messages.filter(m => m.role !== "system");

    const result = await client.messages.create({
      model: request.config.model,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      temperature: request.config.temperature,
      max_tokens: request.config.maxTokens,
    });

    const content = result.content.map(c => (c as any).text || "").join("");

    return {
      content,
      responseId: result.id,
      model: result.model,
      tokens: {
        prompt: result.usage?.input_tokens || 0,
        completion: result.usage?.output_tokens || 0,
        total: (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0),
      },
      executionTime: Date.now() - start,
    };
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const start = Date.now();
    const client = this.getClient();

    const systemMessage = request.messages.find(m => m.role === "system");
    const chatMessages = request.messages.filter(m => m.role !== "system");

    const stream = await client.messages.create({
      model: request.config.model,
      system: systemMessage?.content,
      messages: chatMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      temperature: request.config.temperature,
      max_tokens: request.config.maxTokens,
      stream: true,
    });

    let responseId = "";
    let model = "";

    for await (const chunk of stream) {
      if (chunk.type === "message_start") {
        responseId = chunk.message.id;
        model = chunk.message.model;
      }

      if (chunk.type === "content_block_delta" && (chunk.delta as any)?.text) {
        yield { content: (chunk.delta as any).text, done: false };
      }
    }

    yield {
      content: "",
      done: true,
      responseId,
      tokens: { prompt: 0, completion: 0, total: 0 },
    };
  }
}
