import { SessionManager } from "./session-manager.js";
import { PersistentMemory } from "./persistent-memory.js";
import { ConversationMemory } from "./conversation-memory.js";
import { AI_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import { logger } from "../../../lib/logger/index.js";
import type { MemoryEntry } from "../types/memory.types.js";

export class MemoryManager {
  private static instance: MemoryManager;
  private sessionManager: SessionManager;
  private persistentMemory: PersistentMemory;
  private conversationMemory: ConversationMemory;

  private constructor() {
    this.sessionManager = new SessionManager();
    this.persistentMemory = new PersistentMemory();
    this.conversationMemory = new ConversationMemory();
  }

  static getInstance(): MemoryManager {
    if (!this.instance) {
      this.instance = new MemoryManager();
    }
    return this.instance;
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getPersistentMemory(): PersistentMemory {
    return this.persistentMemory;
  }

  getConversationMemory(): ConversationMemory {
    return this.conversationMemory;
  }

  async assembleSystemPromptVolatile(userId: string): Promise<string> {
    if (!AGENT_CONFIG.enableMemory) return "";

    try {
      const memories = this.persistentMemory.formatMemoriesForPrompt(userId);
      const profile = this.persistentMemory.formatProfileForPrompt(userId);

      const parts: string[] = [];
      if (memories) parts.push(memories);
      if (profile) parts.push(profile);

      const result = parts.join("\n\n");
      logger.debug({ userId, memorySize: result.length }, "System prompt volatile assembled");
      return result;
    } catch (error: unknown) {
      logger.error({ error: error instanceof Error ? error.message : String(error), userId }, "Failed to assemble volatile prompt");
      return "";
    }
  }

  async afterTurn(userId: string, sessionId: string, userMessage: string, assistantResponse: string): Promise<MemoryEntry[]> {
    const updates: MemoryEntry[] = [];

    if (!AGENT_CONFIG.enableSelfReview) return updates;

    try {
      await this.persistentMemory.updateProfile(userId, {
        interactionCount: (this.persistentMemory as any)._profileCache?.get(userId)?.interactionCount
          ? (this.persistentMemory as any)._profileCache.get(userId).interactionCount + 1
          : 1,
      });
    } catch {
      // Non-critical - profile update is best-effort
    }

    return updates;
  }

  async loadContextForSession(sessionId: string, userId: string, organizationId?: string): Promise<{
    session: any;
    messages: any[];
    memories: MemoryEntry[];
  }> {
    const session = await this.sessionManager.getOrCreateSession(sessionId, userId, organizationId);
    const messages = this.sessionManager.getMessages(sessionId);
    const memories = AGENT_CONFIG.enableMemory ? await this.persistentMemory.getMemories(userId) : [];

    return { session, messages, memories };
  }

  async clearUserData(userId: string): Promise<void> {
    await this.sessionManager.clearUserSessions(userId);
    this.persistentMemory.clearCache(userId);
  }
}
