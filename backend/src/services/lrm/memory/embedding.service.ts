import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger/index.js";

export class EmbeddingService {
  private cache = new Map<string, number[]>();

  async generate(text: string): Promise<number[]> {
    const key = text.slice(0, 100);
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const embedding = await this.callEmbeddingAPI(text);
      this.cache.set(key, embedding);
      if (this.cache.size > 5000) {
        const first = this.cache.keys().next().value;
        if (first) this.cache.delete(first);
      }
      return embedding;
    } catch (err) {
      logger.warn({ err }, "Embedding API call failed, using fallback");
      return this.fallbackEmbedding(text);
    }
  }

  async generateBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.generate(t)));
  }

  private async callEmbeddingAPI(text: string): Promise<number[]> {
    const openaiKey = env.OPENAI_API_KEY;
    const openrouterKey = env.OPENROUTER_API_KEY;
    const apiKey = openaiKey || openrouterKey;
    const baseUrl = openaiKey ? "https://api.openai.com/v1" : (env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1");
    const model = openaiKey ? "text-embedding-3-small" : "openai/text-embedding-3-small";

    if (!apiKey) {
      return this.fallbackEmbedding(text);
    }

    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: text, model }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json() as { data: { embedding: number[] }[] };
    return data.data[0].embedding;
  }

  fallbackEmbedding(text: string): number[] {
    const dim = 128;
    const embedding = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    const charCodes = text.split("").map(c => c.charCodeAt(0));

    for (let i = 0; i < words.length && i < dim; i++) {
      let hash = 0;
      for (const ch of words[i]) {
        hash = ((hash << 5) - hash) + ch.charCodeAt(0);
        hash |= 0;
      }
      embedding[i] = (hash % 10000) / 10000;
    }

    for (let i = 0; i < charCodes.length && i < dim; i++) {
      embedding[i] = (embedding[i] + (charCodes[i] % 1000) / 1000) / 2;
    }

    const magnitude = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0)) || 1;
    return embedding.map(v => v / magnitude);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB) || 1;
    return dot / denom;
  }
}
