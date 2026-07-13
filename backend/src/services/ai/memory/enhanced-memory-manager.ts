import { embeddingService } from "./embedding-service.js";
import { documentIngestor } from "./document-ingestor.js";
import { SessionManager } from "./session-manager.js";
import { AI_CONFIG, AGENT_CONFIG } from "../config.js";
import type { MemoryEntry, ConversationSession, UserProfile } from "../types/memory.types.js";
import type { AgentMessage } from "../types/message.types.js";
import { logger } from "../../../lib/logger/index.js";

export type MemoryType = "working" | "episodic" | "semantic" | "procedural";
export type MemoryImportance = "critical" | "high" | "medium" | "low";

export interface EnhancedMemoryEntry {
  id: string;
  content: string;
  summary?: string;
  type: MemoryType;
  importance: MemoryImportance;
  source: string;
  userId: string;
  sessionId?: string;
  tags: string[];
  embedding?: number[];
  score: number;
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
  expiresAt?: Date;
  metadata: Record<string, unknown>;
}

export interface MemoryQuery {
  userId: string;
  query?: string;
  types?: MemoryType[];
  tags?: string[];
  limit?: number;
  minScore?: number;
  useSemanticSearch?: boolean;
}

export class EnhancedMemoryManager {
  private static instance: EnhancedMemoryManager;
  private sessionManager: SessionManager;
  private workingMemory: Map<string, EnhancedMemoryEntry[]> = new Map();
  private initialized = false;

  private constructor() {
    this.sessionManager = new SessionManager();
  }

  static getInstance(): EnhancedMemoryManager {
    if (!this.instance) {
      this.instance = new EnhancedMemoryManager();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      await documentIngestor.initialize();
      this.initialized = true;
      logger.info("EnhancedMemoryManager initialized with RAG support");
    } catch (error) {
      logger.warn({ error }, "EnhancedMemoryManager initialization partial");
      this.initialized = true;
    }
  }

  // ─── Working Memory (current conversation, fast access) ───

  addToWorkingMemory(userId: string, entry: Omit<EnhancedMemoryEntry, "id" | "createdAt" | "accessCount" | "lastAccessedAt" | "score">): void {
    const mems = this.workingMemory.get(userId) || [];
    const full: EnhancedMemoryEntry = {
      ...entry,
      id: `wm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      accessCount: 0,
      lastAccessedAt: new Date(),
      score: 1.0,
      createdAt: new Date(),
    };
    mems.push(full);

    if (mems.length > 50) {
      mems.sort((a, b) => b.score - a.score);
      mems.length = 50;
    }

    this.workingMemory.set(userId, mems);
  }

  getWorkingMemory(userId: string): EnhancedMemoryEntry[] {
    const mems = this.workingMemory.get(userId) || [];
    mems.sort((a, b) => b.score - a.score);
    return mems.slice(0, 20);
  }

  clearWorkingMemory(userId: string): void {
    this.workingMemory.delete(userId);
  }

  // ─── Episodic Memory (past conversations, experiences) ───

  async storeEpisode(
    userId: string,
    content: string,
    metadata: Record<string, unknown> = {}
  ): Promise<EnhancedMemoryEntry> {
    const importance = this.calculateImportance(content);
    let embedding: number[] | undefined;

    try {
      embedding = await embeddingService.embed(content);
    } catch {
      // Non-critical
    }

    const entry: EnhancedMemoryEntry = {
      id: `ep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: "episodic",
      importance,
      source: metadata.source as string || "conversation",
      userId,
      sessionId: metadata.sessionId as string,
      tags: (metadata.tags as string[]) || [],
      embedding,
      score: this.importanceToScore(importance),
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metadata,
    };

    try {
      if (embedding) {
        await documentIngestor.getVectorStore().upsert([{
          id: entry.id,
          vector: embedding,
          metadata: {
            type: "episodic",
            userId,
            importance,
            tags: entry.tags,
            createdAt: entry.createdAt.toISOString(),
          },
          content,
        }]);
      }
    } catch (error) {
      logger.warn({ error }, "Failed to store episode embedding");
    }

    logger.debug({ userId, episodeId: entry.id, importance }, "Episode stored");
    return entry;
  }

  // ─── Semantic Memory (facts, knowledge, concepts) ───

  async storeSemanticMemory(userId: string, content: string, tags: string[] = []): Promise<EnhancedMemoryEntry> {
    let embedding: number[] | undefined;
    try {
      embedding = await embeddingService.embed(content);
    } catch {
      // Non-critical
    }

    const entry: EnhancedMemoryEntry = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      type: "semantic",
      importance: "medium",
      source: "extraction",
      userId,
      tags,
      embedding,
      score: 0.8,
      accessCount: 0,
      lastAccessedAt: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      metadata: {},
    };

    try {
      if (embedding) {
        await documentIngestor.getVectorStore().upsert([{
          id: entry.id,
          vector: embedding,
          metadata: { type: "semantic", userId, tags },
          content,
        }]);
      }
    } catch {
      // Non-critical
    }

    return entry;
  }

  // ─── Memory Retrieval ───

  async retrieveRelevantMemories(query: MemoryQuery): Promise<EnhancedMemoryEntry[]> {
    const results: EnhancedMemoryEntry[] = [];

    // 1. Working memory (always included, fast)
    const working = this.getWorkingMemory(query.userId);
    results.push(...working);

    // 2. Semantic search via RAG
    if (query.useSemanticSearch !== false && query.query) {
      try {
        const searchResults = await documentIngestor.search(query.query, {
          topK: query.limit || 10,
          filter: { userId: query.userId },
        });

        for (const sr of searchResults) {
          if (sr.score < (query.minScore || 0.5)) continue;
          results.push({
            id: `rag_${sr.metadata.id || Date.now()}`,
            content: sr.content,
            type: (sr.metadata.type as MemoryType) || "semantic",
            importance: "medium",
            source: (sr.metadata.source as string) || "rag",
            userId: query.userId,
            tags: (sr.metadata.tags as string[]) || [],
            score: sr.score,
            accessCount: 0,
            lastAccessedAt: new Date(),
            createdAt: new Date(),
            metadata: sr.metadata,
          });
        }
      } catch (error) {
        logger.warn({ error }, "Semantic memory retrieval failed");
      }
    }

    // 3. Filter by type/tags
    let filtered = results;
    if (query.types && query.types.length > 0) {
      filtered = filtered.filter((m) => query.types!.includes(m.type));
    }
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((m) => m.tags.some((t) => query.tags!.includes(t)));
    }

    // Sort by score descending
    filtered.sort((a, b) => b.score - a.score);

    // Update access counts
    for (const mem of filtered) {
      mem.accessCount++;
      mem.lastAccessedAt = new Date();
    }

    return filtered.slice(0, query.limit || 20);
  }

  async getRelevantContext(userId: string, currentQuery: string, topK: number = 10): Promise<string> {
    const memories = await this.retrieveRelevantMemories({
      userId,
      query: currentQuery,
      limit: topK,
      minScore: 0.5,
    });

    if (memories.length === 0) return "";

    const parts: string[] = ["## Relevant Memory Context"];
    const seen = new Set<string>();

    for (const mem of memories) {
      const key = mem.content.slice(0, 100);
      if (seen.has(key)) continue;
      seen.add(key);

      parts.push(`- [${mem.type}, relevance: ${(mem.score * 100).toFixed(0)}%] ${mem.content}`);
    }

    return parts.join("\n");
  }

  // ─── User Profile Management ───

  async updateUserProfile(userId: string, updates: Partial<UserProfile & { preferences: Record<string, unknown> }>): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    Object.assign(profile, updates, { lastInteractionAt: new Date() });
    logger.debug({ userId, updates: Object.keys(updates) }, "User profile updated");
  }

  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    return {
      userId,
      preferences: {},
      commonTopics: [],
      interactionCount: 0,
      lastInteractionAt: new Date(),
      createdAt: new Date(),
    };
  }

  // ─── Session Management ───

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  async loadContext(userId: string, sessionId: string, organizationId?: string, query?: string): Promise<{
    session: ConversationSession;
    messages: AgentMessage[];
    contextPrompt: string;
  }> {
    await this.initialize();

    const session = await this.sessionManager.getOrCreateSession(sessionId, userId, organizationId);
    const messages = this.sessionManager.getMessages(sessionId);

    let contextPrompt = "";

    if (query) {
      contextPrompt = await this.getRelevantContext(userId, query);
    }

    // Add working memory to context
    const working = this.getWorkingMemory(userId);
    if (working.length > 0) {
      const workingStr = working.map((w) => `- ${w.content}`).join("\n");
      contextPrompt += `\n\n## Current Working Context\n${workingStr}`;
    }

    return { session, messages, contextPrompt };
  }

  // ─── Cleanup ───

  async pruneExpiredMemories(): Promise<number> {
    let pruned = 0;
    for (const [, mems] of this.workingMemory) {
      const before = mems.length;
      const after = mems.filter((m) => !m.expiresAt || m.expiresAt > new Date());
      pruned += before - after;
    }
    logger.info({ pruned }, "Working memory pruned");
    return pruned;
  }

  // ─── Helpers ───

  private calculateImportance(content: string): MemoryImportance {
    const critical = /\b(critical|urgent|emergency|important|security|password|payment|error|fail|crash)\b/i;
    const high = /\b(update|create|delete|remove|change|approve|reject|schedule|deadline)\b/i;

    if (critical.test(content)) return "critical";
    if (high.test(content)) return "high";
    if (content.length > 200) return "medium";
    return "low";
  }

  private importanceToScore(importance: MemoryImportance): number {
    const scores = { critical: 1.0, high: 0.8, medium: 0.5, low: 0.2 };
    return scores[importance];
  }

  async clearUserData(userId: string): Promise<void> {
    this.workingMemory.delete(userId);
    await this.sessionManager.clearUserSessions(userId);
  }
}

export const enhancedMemoryManager = EnhancedMemoryManager.getInstance();
