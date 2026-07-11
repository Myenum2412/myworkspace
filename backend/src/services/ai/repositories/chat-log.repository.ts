import mongoose from "mongoose";
import { collections } from "../../../lib/db/collections.js";
import { v4 as uuid } from "uuid";

export interface ChatLog {
  id: string;
  customerPhone: string;
  customerName?: string;
  incomingMessage: string;
  outgoingMessage: string;
  intent: string;
  intentConfidence: number;
  entities: Record<string, any>;
  language: string;
  databaseOperations: string[];
  processingTimeMs: number;
  aiModel: string;
  tokensUsed: number;
  status: "success" | "error" | "fallback";
  errorMessage?: string;
  channel: "whatsapp";
  createdAt: Date;
}

export class ChatLogRepository {
  private getCollection() {
    return mongoose.connection.db!.collection(collections.chatLogs);
  }

  async log(data: Omit<ChatLog, "id" | "createdAt">): Promise<ChatLog> {
    const logEntry: ChatLog = {
      id: uuid(),
      ...data,
      createdAt: new Date(),
    };

    await this.getCollection().insertOne(logEntry as any);
    return logEntry;
  }

  async getLogsByCustomer(
    customerPhone: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<ChatLog[]> {
    const { limit = 50, offset = 0 } = options;

    const results = await this.getCollection()
      .find({ customerPhone })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return results as unknown as ChatLog[];
  }

  async getLogsByIntent(
    intent: string,
    options: { limit?: number; startDate?: Date; endDate?: Date } = {}
  ): Promise<ChatLog[]> {
    const { limit = 100, startDate, endDate } = options;

    const query: any = { intent };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const results = await this.getCollection()
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return results as unknown as ChatLog[];
  }

  async countTotal(): Promise<number> {
    return this.getCollection().countDocuments();
  }

  async getStats(options: { startDate?: Date; endDate?: Date } = {}): Promise<{
    totalConversations: number;
    uniqueCustomers: number;
    intentDistribution: Record<string, number>;
    avgProcessingTime: number;
    successRate: number;
  }> {
    const { startDate, endDate } = options;

    const matchQuery: any = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = startDate;
      if (endDate) matchQuery.createdAt.$lte = endDate;
    }

    const collection = this.getCollection();

    const [total, unique, intentStats, avgTime, successCount] = await Promise.all([
      collection.countDocuments(matchQuery),
      collection.distinct("customerPhone", matchQuery).then((phones: string[]) => phones.length),
      collection.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$intent", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
      collection.aggregate([
        { $match: matchQuery },
        { $group: { _id: null, avg: { $avg: "$processingTimeMs" } } },
      ]).toArray(),
      collection.countDocuments({ ...matchQuery, status: "success" }),
    ]);

    const intentDistribution: Record<string, number> = {};
    intentStats.forEach((stat: any) => {
      intentDistribution[stat._id] = stat.count;
    });

    return {
      totalConversations: total,
      uniqueCustomers: unique,
      intentDistribution,
      avgProcessingTime: avgTime[0]?.avg || 0,
      successRate: total > 0 ? (successCount / total) * 100 : 0,
    };
  }
}
