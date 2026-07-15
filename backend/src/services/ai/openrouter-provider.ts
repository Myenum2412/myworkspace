import OpenAI from "openai";
import { IAIProvider } from "./base-provider.js";
import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from "./types.js";

export class OpenRouterProvider implements IAIProvider {
  name = "openrouter";
  private client: OpenAI | null = null;
  private apiKey: string = "";

  private getClient(): OpenAI {
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    const baseURL = process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1";
    if (!this.client || this.apiKey !== apiKey) {
      this.apiKey = apiKey;
      this.client = new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders: {
          "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "",
          "X-OpenRouter-Title": process.env.OPENROUTER_SITE_NAME || "MyWorkspace",
        },
      });
    }
    return this.client;
  }

  validateConfig(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const start = Date.now();
    const client = this.getClient();

    const result = await client.chat.completions.create({
      model: request.config.model,
      messages: request.messages as any,
      temperature: request.config.temperature,
      max_tokens: request.config.maxTokens,
    });

    return {
      content: result.choices[0]?.message?.content || "",
      responseId: result.id,
      model: result.model,
      tokens: {
        prompt: result.usage?.prompt_tokens || 0,
        completion: result.usage?.completion_tokens || 0,
        total: result.usage?.total_tokens || 0,
      },
      executionTime: Date.now() - start,
    };
  }

  async *stream(request: AICompletionRequest): AsyncGenerator<AIStreamChunk> {
    const start = Date.now();
    const client = this.getClient();

    const stream = await client.chat.completions.create({
      model: request.config.model,
      messages: request.messages as any,
      temperature: request.config.temperature,
      max_tokens: request.config.maxTokens,
      stream: true,
    });

    let responseId = "";
    let model = "";

    for await (const chunk of stream) {
      if (!responseId) responseId = chunk.id;
      if (!model) model = chunk.model;

      const content = chunk.choices[0]?.delta?.content || "";

      yield {
        content,
        done: false,
      };
    }

    yield {
      content: "",
      done: true,
      responseId,
      tokens: { prompt: 0, completion: 0, total: 0 },
    };
  }
}
