import { Schema, model, Document } from "mongoose";
import { logger } from "./logger/index.js";

export interface IQuota extends Document {
  tenantId: string;
  resource: string;
  limit: number;
  usage: number;
  softLimit?: number;
  resetPeriod: "daily" | "weekly" | "monthly" | "never";
  lastResetAt: Date;
  nextResetAt?: Date;
}

const quotaSchema = new Schema<IQuota>({
  tenantId: { type: String, required: true, index: true },
  resource: { type: String, required: true },
  limit: { type: Number, required: true },
  usage: { type: Number, default: 0 },
  softLimit: { type: Number },
  resetPeriod: { type: String, enum: ["daily", "weekly", "monthly", "never"], default: "monthly" },
  lastResetAt: { type: Date, default: Date.now },
  nextResetAt: { type: Date },
});

quotaSchema.index({ tenantId: 1, resource: 1 }, { unique: true });

export const Quota = model<IQuota>("Quota", quotaSchema);

export const QuotaResources = {
  STORAGE_BYTES: "storage.bytes",
  API_REQUESTS: "api.requests",
  FILE_COUNT: "file.count",
  TEAM_COUNT: "team.count",
  USER_COUNT: "user.count",
  PROJECT_COUNT: "project.count",
  BANDWIDTH_BYTES: "bandwidth.bytes",
  SEARCH_QUERIES: "search.queries",
  EXPORT_COUNT: "export.count",
} as const;

export class QuotaManager {
  async initializeDefaults(tenantId: string): Promise<void> {
    const defaults = [
      { resource: QuotaResources.STORAGE_BYTES, limit: 10 * 1024 * 1024 * 1024, softLimit: 8 * 1024 * 1024 * 1024 },
      { resource: QuotaResources.FILE_COUNT, limit: 100000 },
      { resource: QuotaResources.TEAM_COUNT, limit: 500 },
      { resource: QuotaResources.USER_COUNT, limit: 5000 },
      { resource: QuotaResources.PROJECT_COUNT, limit: 1000 },
      { resource: QuotaResources.API_REQUESTS, limit: 1000000, resetPeriod: "daily" },
      { resource: QuotaResources.SEARCH_QUERIES, limit: 50000, resetPeriod: "daily" },
    ] as const;

    for (const def of defaults) {
      await Quota.updateOne(
        { tenantId, resource: def.resource },
        {
          $setOnInsert: {
            tenantId,
            resource: def.resource,
            limit: def.limit,
            usage: 0,
            softLimit: (def as any).softLimit,
            resetPeriod: (def as any).resetPeriod || "monthly",
            lastResetAt: new Date(),
          },
        },
        { upsert: true },
      );
    }
  }

  async checkQuota(tenantId: string, resource: string, amount = 1): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
  }> {
    const quota = await Quota.findOne({ tenantId, resource });
    if (!quota) return { allowed: true, current: 0, limit: Infinity, remaining: Infinity };

    if (quota.resetPeriod !== "never" && quota.nextResetAt && quota.nextResetAt <= new Date()) {
      quota.usage = 0;
      quota.lastResetAt = new Date();
      await quota.save();
    }

    const projected = quota.usage + amount;
    const remaining = quota.limit - quota.usage;

    return {
      allowed: projected <= quota.limit,
      current: quota.usage,
      limit: quota.limit,
      remaining: Math.max(0, remaining),
    };
  }

  async incrementUsage(tenantId: string, resource: string, amount = 1): Promise<void> {
    await Quota.updateOne(
      { tenantId, resource },
      { $inc: { usage: amount } },
    );
  }

  async decrementUsage(tenantId: string, resource: string, amount = 1): Promise<void> {
    await Quota.updateOne(
      { tenantId, resource },
      { $inc: { usage: -amount } },
    );
  }

  async updateLimit(tenantId: string, resource: string, limit: number): Promise<void> {
    await Quota.updateOne(
      { tenantId, resource },
      { $set: { limit } },
    );
  }

  async getUsageSummary(tenantId: string): Promise<Array<{
    resource: string;
    limit: number;
    usage: number;
    usagePercent: number;
    remaining: number;
  }>> {
    const quotas = await Quota.find({ tenantId }).lean();
    return quotas.map(q => ({
      resource: q.resource,
      limit: q.limit,
      usage: q.usage,
      usagePercent: q.limit > 0 ? Math.round((q.usage / q.limit) * 100) : 0,
      remaining: Math.max(0, q.limit - q.usage),
    }));
  }
}

export const quotaManager = new QuotaManager();
