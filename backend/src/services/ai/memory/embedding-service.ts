import { AI_CONFIG } from "../config.js";
import { logger } from "../../../lib/logger/index.js";

interface EmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

export class EmbeddingService {
  private cache: Map<string, { embedding: number[]; expiry: number }> = new Map();
  private cacheTTL = 3600000;
  private provider: string;
  private apiKey: string;

  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || process.env.AI_PROVIDER || "openai";
    this.apiKey = process.env.EMBEDDING_API_KEY || process.env.AI_API_KEY || "";
  }

  async embed(text: string): Promise<number[]> {
    const cacheKey = `emb:${text.slice(0, 200)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.embedding;
    }

    const embedding = await this.embedWithProvider(text);

    if (this.cache.size > 10000) {
      const keys = Array.from(this.cache.keys()).slice(0, 2000);
      for (const key of keys) this.cache.delete(key);
    }

    this.cache.set(cacheKey, { embedding, expiry: Date.now() + this.cacheTTL });
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  private async embedWithProvider(text: string): Promise<number[]> {
    const provider = (this.provider || "openai").toLowerCase();

    switch (provider) {
      case "openai":
      case "openrouter":
      case "azure":
        return this.embedOpenAI(text);
      case "google":
      case "gemini":
        return this.embedGoogle(text);
      case "ollama":
        return this.embedOllama(text);
      default:
        return this.embedOpenAI(text);
    }
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const apiKey = this.apiKey;
    const model = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
    const baseUrl = process.env.EMBEDDING_BASE_URL || "https://api.openai.com/v1";

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as EmbeddingResponse;
    return data.data[0].embedding;
  }

  private async embedGoogle(text: string): Promise<number[]> {
    const apiKey = process.env.GOOGLE_AI_API_KEY || "";
    const model = process.env.EMBEDDING_MODEL || "text-embedding-004";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: `models/${model}`, content: { parts: [{ text }] } }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google Embedding API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
  }

  private async embedOllama(text: string): Promise<number[]> {
    const baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    const model = process.env.EMBEDDING_MODEL || "nomic-embed-text";

    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama Embedding API error: ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding || [];
  }

  async getEmbeddingDimension(): Promise<number> {
    try {
      const test = await this.embed("test");
      return test.length;
    } catch {
      return 1536;
    }
  }
}

export const embeddingService = new EmbeddingService();
