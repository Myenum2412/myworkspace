import { LrmLearningEvent } from "../../../lib/db/models/LrmLearningEvent.js";
import { LrmUserProfile } from "../../../lib/db/models/LrmUserProfile.js";
import { LrmMemory } from "../../../lib/db/models/LrmMemory.js";
import { MemoryRanker } from "../memory/memory-ranker.js";
import { v4 as uuid } from "uuid";
import { logger } from "../../../lib/logger/index.js";

export class LearningPipeline {
  private memoryRanker: MemoryRanker;

  constructor() {
    this.memoryRanker = new MemoryRanker();
  }

  async recordFeedback(event: {
    orgId: string; userId: string; eventType: string;
    source: string; data: Record<string, unknown>; outcome: "positive" | "negative" | "neutral";
  }): Promise<void> {
    try {
      await LrmLearningEvent.create({
        id: uuid(), orgId: event.orgId, userId: event.userId,
        eventType: event.eventType,
        source: event.source, data: event.data,
        outcome: event.outcome,
        weight: event.outcome === "positive" ? 2 : event.outcome === "negative" ? 1 : 0.5,
        createdAt: new Date(),
      });
    } catch (err) {
      logger.warn({ err }, "Failed to record learning event");
    }
  }

  async processFeedback(userId: string, orgId: string, messageId: string, rating: "like" | "dislike" | "neutral"): Promise<void> {
    const outcome = rating === "like" ? "positive" : rating === "dislike" ? "negative" : "neutral";
    
    await this.recordFeedback({
      orgId, userId, eventType: "feedback",
      source: `message:${messageId}`,
      data: { messageId, rating },
      outcome,
    });

    if (outcome === "positive") {
      const memories = await LrmMemory.find({
        orgId, userId, "metadata.messageId": messageId,
      }).lean();
      
      for (const mem of memories) {
        const newImportance = this.memoryRanker.computeImportanceBoost(mem.importance, "positive");
        await LrmMemory.findOneAndUpdate(
          { id: mem.id },
          { $set: { importance: newImportance } }
        );
      }
    }
  }

  async getUserProfile(userId: string, orgId: string): Promise<any> {
    try {
      const existing = await LrmUserProfile.findOne({ userId, orgId }).lean();
      
      if (existing) {
        return existing;
      }
      
      const created = await LrmUserProfile.create({
        userId, orgId, expertise: [], preferences: {},
        interactionPatterns: { commonTopics: [], activeHours: [], averageSessionLength: 0 },
        learnedContext: {}, feedbackCount: 0, lastUpdated: new Date(),
      });
      
      return created.toObject();
    } catch {
      return { expertise: [], preferences: {} };
    }
  }

  async updateUserProfile(userId: string, orgId: string, updates: Record<string, unknown>): Promise<void> {
    try {
      await LrmUserProfile.findOneAndUpdate(
        { userId, orgId },
        { $set: { ...updates, lastUpdated: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      logger.warn({ err, userId }, "Failed to update user profile");
    }
  }
}
