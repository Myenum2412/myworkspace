import mongoose from "mongoose";
import { collections } from "../../../lib/db/collections.js";
import type { AgentMessage } from "../types/message.types.js";
import type { ConversationSession, SessionMetadata } from "../types/memory.types.js";
import { AI_CONFIG } from "../config.js";
import { logger } from "../../../lib/logger/index.js";

export class SessionManager {
  private cache: Map<string, ConversationSession> = new Map();

  private getCollection() {
    return mongoose.connection.db!.collection(collections.conversations);
  }

  async getOrCreateSession(sessionId: string, userId: string, organizationId?: string): Promise<ConversationSession> {
    const cached = this.cache.get(sessionId);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    const existing = await this.getCollection().findOne({
      sessionId,
      expiresAt: { $gt: new Date() },
    });

    if (existing) {
      const session = this.toSession(existing);
      this.cache.set(sessionId, session);
      return session;
    }

    const session: ConversationSession = {
      sessionId,
      userId,
      organizationId,
      messages: [],
      metadata: {
        model: AI_CONFIG.model,
        provider: AI_CONFIG.provider,
        turnCount: 0,
        tokenCount: 0,
        compressed: false,
        tags: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + AI_CONFIG.memoryExpiryHours * 60 * 60 * 1000),
    };

    await this.getCollection().insertOne(session as any);
    this.cache.set(sessionId, session);
    return session;
  }

  async addMessage(sessionId: string, message: AgentMessage): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session) {
      logger.warn({ sessionId }, "Attempted to add message to non-cached session");
      return;
    }

    session.messages.push(message);
    session.metadata.turnCount += message.role === "user" ? 1 : 0;
    session.updatedAt = new Date();

    await this.getCollection().updateOne(
      { sessionId },
      {
        $push: { messages: message as any },
        $set: {
          "metadata.turnCount": session.metadata.turnCount,
          updatedAt: session.updatedAt,
        },
      }
    );
  }

  async updateMetadata(sessionId: string, update: Partial<SessionMetadata>): Promise<void> {
    const session = this.cache.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...update };
    }

    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(update)) {
      setFields[`metadata.${key}`] = value;
    }
    setFields.updatedAt = new Date();

    await this.getCollection().updateOne(
      { sessionId },
      { $set: setFields }
    );
  }

  getMessages(sessionId: string, limit?: number): AgentMessage[] {
    const session = this.cache.get(sessionId);
    if (!session) return [];
    const msgs = session.messages;
    return limit && msgs.length > limit ? msgs.slice(-limit) : msgs;
  }

  getSession(sessionId: string): ConversationSession | undefined {
    return this.cache.get(sessionId);
  }

  async compressSession(sessionId: string, summary: string): Promise<void> {
    const session = this.cache.get(sessionId);
    if (!session || session.messages.length < 10) return;

    const protectedMessages = session.messages.slice(-10);
    const compressible = session.messages.slice(0, -10);

    if (compressible.length < 5) return;

    session.messages = [
      { role: "system" as const, content: `[Conversation summary of previous ${compressible.length} messages]: ${summary}` },
      ...protectedMessages,
    ];
    session.metadata.compressed = true;
    session.updatedAt = new Date();

    await this.getCollection().updateOne(
      { sessionId },
      {
        $set: {
          messages: session.messages as any,
          "metadata.compressed": true,
          updatedAt: session.updatedAt,
        },
      }
    );
  }

  async clearSession(sessionId: string): Promise<void> {
    await this.getCollection().deleteOne({ sessionId });
    this.cache.delete(sessionId);
  }

  async clearUserSessions(userId: string): Promise<void> {
    await this.getCollection().deleteMany({ userId });
    for (const [key, session] of this.cache) {
      if (session.userId === userId) this.cache.delete(key);
    }
  }

  formatHistoryForPrompt(sessionId: string, maxMessages?: number): AgentMessage[] {
    const session = this.cache.get(sessionId);
    if (!session) return [];
    const msgs = session.messages;
    if (!maxMessages || msgs.length <= maxMessages) return msgs;
    return msgs.slice(-maxMessages);
  }

  private toSession(doc: any): ConversationSession {
    return {
      sessionId: doc.sessionId,
      userId: doc.userId,
      organizationId: doc.organizationId,
      messages: doc.messages || [],
      metadata: doc.metadata || { model: "", provider: "", turnCount: 0, tokenCount: 0, compressed: false, tags: [] },
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      expiresAt: doc.expiresAt,
    };
  }
}
