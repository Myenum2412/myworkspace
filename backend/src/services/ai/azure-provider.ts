import OpenAI from "openai";
import { IAIProvider } from "./base-provider.js";
import { AICompletionRequest, AICompletionResponse, AIStreamChunk } from "./types.js";

export class AzureProvider implements IAIProvider {
  name = "azure";
  private client: OpenAI | null = null;
  private apiKey: string = "";
  private endpoint: string = "";
  private deployment: string = "";

  private getClient(): OpenAI {
    const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "";

    if (!this.client || this.apiKey !== apiKey || this.endpoint !== endpoint) {
      this.apiKey = apiKey;
      this.endpoint = endpoint;
      this.deployment = deployment;
      this.client = new OpenAI({
        apiKey,
        baseURL: `${endpoint}/openai/deployments/${deployment}`,
        defaultQuery: { "api-version": "2024-05-01-preview" },
        defaultHeaders: { "api-key": apiKey },
      });
    }
    return this.client;
  }

  validateConfig(): boolean {
    return !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
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
    const client = this.getClient();

    const stream = await client.chat.completions.create({
      model: request.config.model,
      messages: request.messages as any,
      temperature: request.config.temperature,
      max_tokens: request.config.maxTokens,
      stream: true,
    });

    let responseId = "";

    for await (const chunk of stream) {
      if (!responseId) responseId = chunk.id;
      const content = chunk.choices[0]?.delta?.content || "";
      yield { content, done: false };
    }

    yield {
      content: "",
      done: true,
      responseId,
      tokens: { prompt: 0, completion: 0, total: 0 },
    };
  }
}
