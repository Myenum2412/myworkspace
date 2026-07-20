import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "./logger/index.js";

export interface IOutboxMessage extends Document {
  messageId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  status: "pending" | "published" | "failed";
  publishedAt?: Date;
  failedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

const outboxSchema = new Schema<IOutboxMessage>({
  messageId: { type: String, required: true, unique: true },
  aggregateType: { type: String, required: true, index: true },
  aggregateId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, required: true },
  headers: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["pending", "published", "failed"], default: "pending", index: true },
  publishedAt: { type: Date },
  failedAt: { type: Date },
  error: { type: String },
  retryCount: { type: Number, default: 0 },
  maxRetries: { type: Number, default: 5 },
  createdAt: { type: Date, default: Date.now },
});

outboxSchema.index({ status: 1, createdAt: 1 });
outboxSchema.index({ aggregateType: 1, aggregateId: 1, eventType: 1 });

export const OutboxMessage = model<IOutboxMessage>("OutboxMessage", outboxSchema);

export class TransactionalOutbox {
  async enqueue(
    aggregateType: string,
    aggregateId: string,
    eventType: string,
    payload: Record<string, unknown>,
    headers: Record<string, unknown> = {},
  ): Promise<IOutboxMessage> {
    return OutboxMessage.create({
      messageId: uuid(),
      aggregateType,
      aggregateId,
      eventType,
      payload,
      headers,
      status: "pending",
      retryCount: 0,
      maxRetries: 5,
      createdAt: new Date(),
    });
  }

  async markPublished(messageId: string): Promise<void> {
    await OutboxMessage.updateOne(
      { messageId },
      { $set: { status: "published", publishedAt: new Date() } },
    );
  }

  async markFailed(messageId: string, error: string): Promise<void> {
    await OutboxMessage.updateOne(
      { messageId },
      {
        $set: { status: "failed", failedAt: new Date(), error },
        $inc: { retryCount: 1 },
      },
    );
  }

  async getPendingMessages(
    batchSize = 100,
    olderThanSeconds = 5,
  ): Promise<any[]> {
    const cutoff = new Date(Date.now() - olderThanSeconds * 1000);
    return OutboxMessage.find({
      status: "pending",
      createdAt: { $lte: cutoff },
      retryCount: { $lt: 5 },
    })
      .sort({ createdAt: 1 })
      .limit(batchSize)
      .lean();
  }

  async getFailedMessages(limit = 50): Promise<any[]> {
    return OutboxMessage.find({ status: "failed" })
      .sort({ failedAt: -1 })
      .limit(limit)
      .lean();
  }

  async getStats(): Promise<{
    pending: number;
    published: number;
    failed: number;
    oldestPending?: Date;
  }> {
    const [pending, published, failed, oldest] = await Promise.all([
      OutboxMessage.countDocuments({ status: "pending" }),
      OutboxMessage.countDocuments({ status: "published" }),
      OutboxMessage.countDocuments({ status: "failed" }),
      OutboxMessage.findOne({ status: "pending" }).sort({ createdAt: 1 }).select("createdAt").lean(),
    ]);
    return { pending, published, failed, oldestPending: oldest?.createdAt };
  }

  async cleanupPublishedMessages(olderThanHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const result = await OutboxMessage.deleteMany({
      status: "published",
      publishedAt: { $lte: cutoff },
    });
    return result.deletedCount;
  }
}

export const outbox = new TransactionalOutbox();
