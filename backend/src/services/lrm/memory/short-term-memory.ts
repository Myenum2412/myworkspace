import { LrmMemory } from "../../../lib/db/models/LrmMemory.js";
import { MemoryEntry, MemoryTier } from "../types.js";
import { v4 as uuid } from "uuid";
import { logger } from "../../../lib/logger/index.js";

export class ShortTermMemory {
  private workingStore = new Map<string, MemoryEntry>();

  async store(entry: Omit<MemoryEntry, "id" | "createdAt" | "lastAccessedAt" | "accessCount">): Promise<string> {
    const id = uuid();
    const memory: MemoryEntry = {
      ...entry,
      id,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
    };
    
    if (entry.tier === "working") {
      this.workingStore.set(id, memory);
      if (this.workingStore.size > 100) {
        const oldest = this.workingStore.keys().next().value;
        if (oldest) this.workingStore.delete(oldest);
      }
    }
    
    try {
      await LrmMemory.create({
        id, orgId: entry.orgId, userId: entry.userId || null,
        tier: entry.tier, content: entry.content,
        embedding: entry.embedding || null,
        metadata: entry.metadata, importance: entry.importance,
        accessCount: 0, lastAccessedAt: new Date(),
        createdAt: new Date(),
        expiresAt: entry.tier === "working" ? new Date(Date.now() + 3600000) :
                   entry.tier === "short-term" ? new Date(Date.now() + 86400000) : null,
      });
    } catch (err) {
      logger.warn({ err, id }, "Failed to persist memory to DB");
    }
    return id;
  }

  async recall(orgId: string, userId?: string, tier?: MemoryTier, limit = 20): Promise<MemoryEntry[]> {
    const filter: Record<string, unknown> = { orgId };
    if (userId) filter.userId = userId;
    if (tier) filter.tier = tier;
    try {
      const docs = await LrmMemory.find(filter)
        .sort({ importance: -1, lastAccessedAt: -1 })
        .limit(limit).lean();
      return docs.map(d => ({
        id: d.id, orgId: d.orgId, userId: d.userId || undefined,
        tier: d.tier as MemoryTier, content: d.content,
        embedding: d.embedding || undefined,
        metadata: d.metadata as Record<string, unknown>,
        importance: d.importance, accessCount: d.accessCount,
        lastAccessedAt: d.lastAccessedAt, createdAt: d.createdAt,
      })) as MemoryEntry[];
    } catch { return []; }
  }

  async recallRecent(orgId: string, userId: string, limit = 10): Promise<MemoryEntry[]> {
    return this.recall(orgId, userId, "short-term", limit);
  }

  async get(id: string): Promise<MemoryEntry | null> {
    const working = this.workingStore.get(id);
    if (working) return working;
    try {
      const doc = await LrmMemory.findOne({ id }).lean();
      if (!doc) return null;
      return {
        id: doc.id, orgId: doc.orgId, userId: doc.userId || undefined,
        tier: doc.tier as MemoryTier, content: doc.content,
        embedding: doc.embedding || undefined,
        metadata: doc.metadata as Record<string, unknown>,
        importance: doc.importance, accessCount: doc.accessCount,
        lastAccessedAt: doc.lastAccessedAt, createdAt: doc.createdAt,
      } as MemoryEntry;
    } catch { return null; }
  }

  async updateImportance(id: string, delta: number): Promise<void> {
    try {
      await LrmMemory.findOneAndUpdate({ id }, { $inc: { importance: delta, accessCount: 1 }, $set: { lastAccessedAt: new Date() } });
    } catch {}
    const working = this.workingStore.get(id);
    if (working) {
      working.importance += delta;
      working.accessCount++;
      working.lastAccessedAt = new Date();
    }
  }

  async consolidate(orgId: string, userId: string): Promise<void> {
    const shortTerm = await LrmMemory.find({
      orgId, userId, tier: "short-term",
      createdAt: { $lt: new Date(Date.now() - 86400000) },
    }).lean();
    
    for (const memory of shortTerm) {
      const accessRate = memory.accessCount / Math.max(1, (Date.now() - memory.createdAt.getTime()) / 3600000);
      if (accessRate > 2 || memory.importance > 0.7) {
        await LrmMemory.findOneAndUpdate(
          { id: memory.id },
          { $set: { tier: "long-term", expiresAt: null } }
        );
      }
    }
    logger.info({ orgId, userId, consolidated: shortTerm.length }, "Memory consolidation complete");
  }
}
