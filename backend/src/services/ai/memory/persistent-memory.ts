import mongoose from "mongoose";
import { collections } from "../../../lib/db/collections.js";
import type { MemoryEntry, UserProfile } from "../types/memory.types.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import { AI_CONFIG } from "../config.js";
import { logger } from "../../../lib/logger/index.js";

const COLLECTION_NAME = "aiAgentMemory";

export class PersistentMemory {
  private memoryCache: Map<string, MemoryEntry[]> = new Map();
  private profileCache: Map<string, UserProfile> = new Map();

  private getMemoryCollection() {
    return mongoose.connection.db!.collection(COLLECTION_NAME);
  }

  private getProfileCollection() {
    return mongoose.connection.db!.collection(collections.users);
  }

  async getMemories(userId: string): Promise<MemoryEntry[]> {
    const cached = this.memoryCache.get(userId);
    if (cached) return cached;

    const docs = await this.getMemoryCollection()
      .find({ userId, type: { $ne: "learned" } })
      .sort({ accessCount: -1, updatedAt: -1 })
      .limit(50)
      .toArray();

    const entries = docs.map((d: any) => ({
      id: d.id,
      content: d.content,
      type: d.type,
      source: d.source,
      tags: d.tags || [],
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      accessCount: d.accessCount || 0,
    })) as MemoryEntry[];

    this.memoryCache.set(userId, entries);
    return entries;
  }

  async addMemory(
    userId: string,
    content: string,
    type: MemoryEntry["type"] = "fact",
    source: MemoryEntry["source"] = "agent",
    tags: string[] = []
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content,
      type,
      source,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      accessCount: 0,
    };

    await this.getMemoryCollection().insertOne({ userId, ...entry } as any);

    const cached = this.memoryCache.get(userId);
    if (cached) {
      cached.unshift(entry);
      if (cached.length > 100) cached.pop();
    }

    return entry;
  }

  async removeMemory(userId: string, textMatch: string): Promise<boolean> {
    const result = await this.getMemoryCollection().deleteOne({
      userId,
      content: { $regex: textMatch, $options: "i" },
    });

    if (result.deletedCount > 0) {
      const cached = this.memoryCache.get(userId);
      if (cached) {
        const idx = cached.findIndex((m) =>
          m.content.toLowerCase().includes(textMatch.toLowerCase())
        );
        if (idx >= 0) cached.splice(idx, 1);
      }
      return true;
    }
    return false;
  }

  async replaceMemory(userId: string, oldText: string, newContent: string): Promise<boolean> {
    const result = await this.getMemoryCollection().updateOne(
      { userId, content: { $regex: oldText, $options: "i" } },
      { $set: { content: newContent, updatedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      const cached = this.memoryCache.get(userId);
      if (cached) {
        const entry = cached.find((m) =>
          m.content.toLowerCase().includes(oldText.toLowerCase())
        );
        if (entry) {
          entry.content = newContent;
          entry.updatedAt = new Date();
        }
      }
      return true;
    }
    return false;
  }

  formatMemoriesForPrompt(userId: string): string {
    const entries = this.memoryCache.get(userId);
    if (!entries || entries.length === 0) return "";

    const totalChars = AGENT_CONFIG.memoryCharLimit;
    let result = "## Persistent Memories\n";
    let used = result.length;

    for (const entry of entries) {
      const line = `- ${entry.content}\n`;
      if (used + line.length > totalChars) break;
      result += line;
      used += line.length;
    }

    return result;
  }

  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    const cached = this.profileCache.get(userId);
    if (cached) return cached;

    const user = await this.getProfileCollection().findOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { projection: { name: 1, email: 1 } }
    );

    const profile: UserProfile = {
      userId,
      name: (user as any)?.name || undefined,
      email: (user as any)?.email || undefined,
      preferences: {},
      commonTopics: [],
      interactionCount: 0,
      lastInteractionAt: new Date(),
      createdAt: new Date(),
    };

    this.profileCache.set(userId, profile);
    return profile;
  }

  async updateProfile(userId: string, update: Partial<UserProfile>): Promise<void> {
    const profile = this.profileCache.get(userId);
    if (profile) {
      Object.assign(profile, update, { lastInteractionAt: new Date() });
      if (update.interactionCount !== undefined) {
        profile.interactionCount = update.interactionCount;
      }
    }

    await this.getMemoryCollection().updateOne(
      { userId, type: "profile" },
      { $set: { ...update, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  formatProfileForPrompt(userId: string): string {
    const profile = this.profileCache.get(userId);
    if (!profile) return "";

    const lines: string[] = ["## User Profile"];
    if (profile.name) lines.push(`- Name: ${profile.name}`);
    if (profile.communicationStyle) lines.push(`- Communication style: ${profile.communicationStyle}`);
    if (profile.commonTopics.length > 0) {
      lines.push(`- Common topics: ${profile.commonTopics.slice(0, 5).join(", ")}`);
    }
    lines.push(`- Total interactions: ${profile.interactionCount}`);

    let result = lines.join("\n");
    if (result.length > AGENT_CONFIG.userProfileCharLimit) {
      result = result.substring(0, AGENT_CONFIG.userProfileCharLimit) + "...";
    }

    return result;
  }

  clearCache(userId?: string): void {
    if (userId) {
      this.memoryCache.delete(userId);
      this.profileCache.delete(userId);
    } else {
      this.memoryCache.clear();
      this.profileCache.clear();
    }
  }
}
