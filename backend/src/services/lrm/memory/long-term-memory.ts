import { LrmMemory } from "../../../lib/db/models/LrmMemory.js";
import { MemoryEntry, MemoryTier } from "../types.js";
import { EmbeddingService } from "./embedding.service.js";
import { VectorStore } from "./vector-store.js";
import { logger } from "../../../lib/logger/index.js";
import { v4 as uuid } from "uuid";

export class LongTermMemory {
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.embeddingService = new EmbeddingService();
    this.vectorStore = vectorStore;
  }

  async store(entry: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessedAt" | "accessCount">): Promise<string> {
    const id = uuid();
    const embedding = entry.embedding || await this.embeddingService.generate(entry.content);
    
    try {
      await LrmMemory.create({
        id, orgId: entry.orgId, userId: entry.userId || null,
        tier: "long-term", content: entry.content,
        embedding, metadata: entry.metadata,
        importance: entry.importance, accessCount: 0,
        lastAccessedAt: new Date(), createdAt: new Date(), expiresAt: null,
      });
      await this.vectorStore.index(id, entry.content, { orgId: entry.orgId, tier: "long-term", ...entry.metadata });
    } catch (err) {
      logger.warn({ err, id }, "Failed to persist long-term memory");
    }
    return id;
  }

  async search(query: string, orgId: string, topK = 10): Promise<MemoryEntry[]> {
    const results = await this.vectorStore.searchHybrid(query, topK, orgId, "long-term");
    const entries: MemoryEntry[] = [];
    for (const r of results) {
      try {
        const doc = await LrmMemory.findOne({ id: r.id }).lean();
        if (doc) {
          entries.push({
            id: doc.id, orgId: doc.orgId, userId: doc.userId || undefined,
            tier: "long-term", content: doc.content,
            embedding: doc.embedding || undefined,
            metadata: doc.metadata as Record<string, unknown>,
            importance: doc.importance, accessCount: doc.accessCount,
            lastAccessedAt: doc.lastAccessedAt, createdAt: doc.createdAt,
          });
        }
      } catch {}
    }
    return entries;
  }

  async recallByImportance(orgId: string, userId?: string, limit = 20): Promise<MemoryEntry[]> {
    const filter: Record<string, unknown> = { orgId, tier: "long-term" };
    if (userId) filter.userId = userId;
    try {
      const docs = await LrmMemory.find(filter)
        .sort({ importance: -1, lastAccessedAt: -1 })
        .limit(limit).lean();
      return docs.map(d => ({
        id: d.id, orgId: d.orgId, userId: d.userId || undefined,
        tier: "long-term", content: d.content,
        embedding: d.embedding || undefined,
        metadata: d.metadata as Record<string, unknown>,
        importance: d.importance, accessCount: d.accessCount,
        lastAccessedAt: d.lastAccessedAt, createdAt: d.createdAt,
      })) as MemoryEntry[];
    } catch { return []; }
  }

  async forget(id: string): Promise<void> {
    try {
      await LrmMemory.deleteOne({ id });
      await this.vectorStore.delete(id);
    } catch {}
  }

  async prune(orgId: string, minImportance = 0.1): Promise<number> {
    const result = await LrmMemory.deleteMany({
      orgId, tier: "long-term", importance: { $lt: minImportance },
      accessCount: { $lt: 2 },
      createdAt: { $lt: new Date(Date.now() - 90 * 86400000) },
    });
    logger.info({ orgId, deleted: result.deletedCount }, "Pruned low-importance long-term memories");
    return result.deletedCount || 0;
  }
}
