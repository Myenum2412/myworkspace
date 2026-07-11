import { AI_CONFIG } from "../config.js";
import mongoose from "mongoose";
import { collections } from "../../../lib/db/collections.js";

export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: Record<string, any>;
}

export interface ConversationSession {
  sessionId: string;
  customerPhone: string;
  messages: ConversationMessage[];
  context: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export class ConversationMemory {
  private cache: Map<string, ConversationSession> = new Map();
  private getCollection() {
    return mongoose.connection.db!.collection(collections.conversations);
  }

  async getSession(customerPhone: string): Promise<ConversationSession> {
    const cached = this.cache.get(customerPhone);
    if (cached && cached.expiresAt > new Date()) {
      return cached;
    }

    const session = await this.getCollection().findOne({
      customerPhone,
      expiresAt: { $gt: new Date() },
    });

    if (session) {
      const conversationSession: ConversationSession = {
        sessionId: session.sessionId,
        customerPhone: session.customerPhone,
        messages: session.messages || [],
        context: session.context || {},
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        expiresAt: session.expiresAt,
      };
      this.cache.set(customerPhone, conversationSession);
      return conversationSession;
    }

    const newSession: ConversationSession = {
      sessionId: `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      customerPhone,
      messages: [],
      context: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + AI_CONFIG.memoryExpiryHours * 60 * 60 * 1000),
    };

    await this.getCollection().insertOne(newSession as any);
    this.cache.set(customerPhone, newSession);
    return newSession;
  }

  async addMessage(customerPhone: string, message: ConversationMessage): Promise<void> {
    const session = await this.getSession(customerPhone);
    session.messages.push(message);
    session.updatedAt = new Date();

    if (session.messages.length > AI_CONFIG.maxMemoryMessages) {
      session.messages = session.messages.slice(-AI_CONFIG.maxMemoryMessages);
    }

    await this.getCollection().updateOne(
      { customerPhone, sessionId: session.sessionId },
      { $set: { messages: session.messages, updatedAt: session.updatedAt } }
    );

    this.cache.set(customerPhone, session);
  }

  async updateContext(customerPhone: string, contextUpdate: Record<string, any>): Promise<void> {
    const session = await this.getSession(customerPhone);
    session.context = { ...session.context, ...contextUpdate };
    session.updatedAt = new Date();

    await this.getCollection().updateOne(
      { customerPhone, sessionId: session.sessionId },
      { $set: { context: session.context, updatedAt: session.updatedAt } }
    );

    this.cache.set(customerPhone, session);
  }

  getConversationHistory(customerPhone: string, limit: number = 10): string[] {
    const session = this.cache.get(customerPhone);
    if (!session) return [];
    return session.messages.slice(-limit).map((msg) => `${msg.role}: ${msg.content}`);
  }

  getContext(customerPhone: string): Record<string, any> {
    const session = this.cache.get(customerPhone);
    return session?.context || {};
  }

  async clearSession(customerPhone: string): Promise<void> {
    await this.getCollection().deleteMany({ customerPhone });
    this.cache.delete(customerPhone);
  }
}
