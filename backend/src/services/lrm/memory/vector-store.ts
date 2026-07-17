import { EmbeddingService } from "./embedding.service.js";
import { LrmMemory } from "../../../lib/db/models/LrmMemory.js";
import { LrmChunk } from "../../../lib/db/models/LrmChunk.js";
import { logger } from "../../../lib/logger/index.js";
import { v4 as uuid } from "uuid";

interface VectorEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  score?: number;
}

export class VectorStore {
  private inMemory = new Map<string, VectorEntry>();
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async index(id: string, content: string, metadata: Record<string, unknown> = {}): Promise<void> {
    const embedding = await this.embeddingService.generate(content);
    this.inMemory.set(id, { id, content, embedding, metadata });
  }

  async indexBatch(entries: { id: string; content: string; metadata?: Record<string, unknown> }[]): Promise<void> {
    const chunks = entries.filter(e => e.content.length > 0);
    const contents = chunks.map(e => e.content);
    const embeddings = await this.embeddingService.generateBatch(contents);
    for (let i = 0; i < chunks.length; i++) {
      this.inMemory.set(chunks[i].id, {
        id: chunks[i].id,
        content: chunks[i].content,
        embedding: embeddings[i],
        metadata: chunks[i].metadata || {},
      });
    }
  }

  async search(query: string, topK = 10, filter?: (meta: Record<string, unknown>) => boolean): Promise<VectorEntry[]> {
    if (this.inMemory.size === 0) return [];

    const queryEmbedding = await this.embeddingService.generate(query);
    const results: VectorEntry[] = [];

    for (const entry of this.inMemory.values()) {
      if (filter && !filter(entry.metadata)) continue;
      const score = this.embeddingService.cosineSimilarity(queryEmbedding, entry.embedding);
      results.push({ ...entry, score });
    }

    results.sort((a, b) => (b.score || 0) - (a.score || 0));
    return results.slice(0, topK);
  }

  async searchHybrid(query: string, topK = 10, orgId?: string, tier?: string): Promise<VectorEntry[]> {
    const semanticResults = await this.search(query, topK * 2);
    const keywordResults = await this.keywordSearch(query, orgId, tier);

    const combined = new Map<string, VectorEntry & { semanticScore: number; keywordScore: number }>();

    for (const r of semanticResults) {
      combined.set(r.id, { ...r, score: r.score || 0, semanticScore: r.score || 0, keywordScore: 0 });
    }
    for (const r of keywordResults) {
      const existing = combined.get(r.id);
      if (existing) {
        existing.keywordScore = r.score || 0;
        existing.score = existing.semanticScore * 0.7 + existing.keywordScore * 0.3;
      } else {
        combined.set(r.id, { ...r, score: (r.score || 0) * 0.3, semanticScore: 0, keywordScore: r.score || 0 });
      }
    }

    return Array.from(combined.values())
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK)
      .map(({ semanticScore, keywordScore, ...rest }) => ({ ...rest, score: rest.score }));
  }

  private async keywordSearch(query: string, orgId?: string, tier?: string): Promise<VectorEntry[]> {
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (tokens.length === 0) return [];

    const filter: Record<string, unknown> = {};
    if (orgId) filter.orgId = orgId;
    if (tier) filter.tier = tier;

    try {
      const memories = await LrmMemory.find({
        ...(orgId ? { orgId } : {}),
        ...(tier ? { tier } : {}),
        content: { $regex: tokens.join("|"), $options: "i" },
      }).limit(20).lean();

      return memories.map(m => ({
        id: m.id,
        content: m.content,
        embedding: m.embedding || [],
        metadata: { ...m.metadata, orgId: m.orgId, tier: m.tier },
        score: 0.5,
      }));
    } catch {
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    this.inMemory.delete(id);
  }

  clear(): void {
    this.inMemory.clear();
  }

  size(): number {
    return this.inMemory.size;
  }
}
