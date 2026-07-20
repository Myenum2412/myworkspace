import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { Organization } from "../db/models/Organization.js";
import { User } from "../db/models/User.js";
import { OrgMember } from "../db/models/OrgMember.js";
import { Project } from "../db/models/Project.js";
import { Task } from "../db/models/Task.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { metricsRegistry } from "../monitoring/index.js";
import { TenantConfig } from "./tenant-admin.js";

export type TenantLifecycleStage = "provisioning" | "trial" | "active" | "suspended" | "cancelled" | "archived";
export type UsageEventType = "login" | "task_created" | "task_completed" | "file_uploaded" | "member_added" | "project_created" | "api_call";

export interface ITenantLifecycle extends Document {
  id: string;
  orgId: string;
  stage: TenantLifecycleStage;
  trialEndsAt?: Date;
  plan: string;
  suspendedAt?: Date;
  suspensionReason?: string;
  cancelledAt?: Date;
  cancellationReason?: string;
  archivedAt?: Date;
  provisionedAt: Date;
  lastActivityAt: Date;
  metadata: Record<string, unknown>;
}

export interface IUsageRecord extends Document {
  id: string;
  orgId: string;
  event: UsageEventType;
  userId: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export interface IUsageSnapshot extends Document {
  id: string;
  orgId: string;
  period: "hour" | "day" | "week" | "month";
  metrics: Record<string, number>;
  recordedAt: Date;
}

const tenantLifecycleSchema = new Schema<ITenantLifecycle>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, unique: true },
  stage: { type: String, enum: ["provisioning", "trial", "active", "suspended", "cancelled", "archived"], default: "provisioning" },
  trialEndsAt: Date,
  plan: { type: String, default: "free" },
  suspendedAt: Date,
  suspensionReason: String,
  cancelledAt: Date,
  cancellationReason: String,
  archivedAt: Date,
  provisionedAt: { type: Date, default: Date.now },
  lastActivityAt: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed, default: {} },
});

const usageRecordSchema = new Schema<IUsageRecord>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  event: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now },
});

usageRecordSchema.index({ orgId: 1, timestamp: -1 });
usageRecordSchema.index({ orgId: 1, event: 1, timestamp: -1 });

const usageSnapshotSchema = new Schema<IUsageSnapshot>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  period: { type: String, enum: ["hour", "day", "week", "month"], required: true },
  metrics: { type: Schema.Types.Mixed, default: {} },
  recordedAt: { type: Date, default: Date.now },
});

usageSnapshotSchema.index({ orgId: 1, period: 1, recordedAt: -1 });

export const TenantLifecycle = model<ITenantLifecycle>("TenantLifecycle", tenantLifecycleSchema);
export const UsageRecord = model<IUsageRecord>("UsageRecord", usageRecordSchema);
export const UsageSnapshot = model<IUsageSnapshot>("UsageSnapshot", usageSnapshotSchema);

export class LifecycleManager {
  async provisionTenant(orgId: string, plan: string, trialDays?: number): Promise<ITenantLifecycle> {
    const existing = await TenantLifecycle.findOne({ orgId }).lean();
    if (existing) return existing as any;

    const lifecycle = await TenantLifecycle.create({
      id: uuid(), orgId,
      stage: trialDays ? "trial" : "active",
      plan,
      trialEndsAt: trialDays ? new Date(Date.now() + trialDays * 86400000) : undefined,
      provisionedAt: new Date(),
      lastActivityAt: new Date(),
    });

    await TenantConfig.create({
      id: uuid(), orgId,
      branding: {}, features: {}, quotas: {}, policies: {}, localization: {}, retention: {},
    });

    logger.info({ orgId, plan, trialDays }, "Tenant provisioned");
    return lifecycle;
  }

  async transitionStage(orgId: string, newStage: TenantLifecycleStage, reason?: string): Promise<ITenantLifecycle> {
    const update: Record<string, unknown> = { stage: newStage };
    switch (newStage) {
      case "suspended": update.suspendedAt = new Date(); update.suspensionReason = reason; break;
      case "cancelled": update.cancelledAt = new Date(); update.cancellationReason = reason; break;
      case "archived": update.archivedAt = new Date(); break;
    }

    const lifecycle = await TenantLifecycle.findOneAndUpdate(
      { orgId },
      { $set: update },
      { new: true },
    );

    if (newStage === "cancelled" || newStage === "suspended") {
      await Organization.updateOne({ id: orgId }, { $set: { isActive: false } });
    }

    logger.info({ orgId, from: lifecycle?.stage, to: newStage, reason }, "Tenant stage transition");
    return lifecycle!;
  }

  async recordUsage(event: {
    orgId: string; event: UsageEventType; userId: string; metadata?: Record<string, unknown>;
  }): Promise<void> {
    await UsageRecord.create({
      id: uuid(), ...event,
      metadata: event.metadata || {},
      timestamp: new Date(),
    });

    await TenantLifecycle.updateOne(
      { orgId: event.orgId },
      { $set: { lastActivityAt: new Date() } },
    );
  }

  async snapshotUsage(orgId: string, period: IUsageSnapshot["period"]): Promise<IUsageSnapshot> {
    const since = new Date();
    switch (period) {
      case "hour": since.setHours(since.getHours() - 1); break;
      case "day": since.setDate(since.getDate() - 1); break;
      case "week": since.setDate(since.getDate() - 7); break;
      case "month": since.setMonth(since.getMonth() - 1); break;
    }

    const [tasksCreated, tasksCompleted, filesUploaded, projectsCreated, logins] = await Promise.all([
      Task.countDocuments({ orgId, createdAt: { $gte: since } }),
      Task.countDocuments({ orgId, status: "completed", updatedAt: { $gte: since } }),
      FileAttachment.countDocuments({ orgId, createdAt: { $gte: since } }),
      Project.countDocuments({ orgId, createdAt: { $gte: since } }),
      UsageRecord.countDocuments({ orgId, event: "login", timestamp: { $gte: since } }),
    ]);

    const totalUsers = await User.countDocuments({ orgId });
    const totalTasks = await Task.countDocuments({ orgId });

    return UsageSnapshot.create({
      id: uuid(), orgId, period,
      metrics: {
        tasksCreated, tasksCompleted, filesUploaded, projectsCreated,
        logins, totalUsers, totalTasks,
        completionRate: totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0,
      },
      recordedAt: new Date(),
    });
  }

  async getUsageAnalytics(orgId: string, period: IUsageSnapshot["period"], limit = 30): Promise<{
    snapshots: IUsageSnapshot[];
    trends: Record<string, { current: number; previous: number; change: number }>;
    forecast: Record<string, number>;
  }> {
    const snapshots = (await UsageSnapshot.find({ orgId, period })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean()) as unknown as IUsageSnapshot[];

    const trends: Record<string, { current: number; previous: number; change: number }> = {};
    if (snapshots.length >= 2) {
      const latest = snapshots[0].metrics;
      const previous = snapshots[1].metrics;
      for (const key of Object.keys(latest)) {
        const cur = latest[key];
        const prev = previous[key] || 0;
        trends[key] = {
          current: cur,
          previous: prev,
          change: prev > 0 ? Math.round(((cur - prev) / prev) * 100) : 0,
        };
      }
    }

    const forecast: Record<string, number> = {};
    for (const [key, trend] of Object.entries(trends)) {
      forecast[key] = Math.round(trend.current * (1 + trend.change / 100));
    }

    return { snapshots, trends, forecast };
  }

  async detectAnomalies(orgId: string): Promise<{
    anomalies: { metric: string; currentValue: number; expectedValue: number; deviation: number; severity: "low" | "medium" | "high" }[];
  }> {
    const dailySnaps = (await UsageSnapshot.find({ orgId, period: "day" })
      .sort({ recordedAt: -1 })
      .limit(14)
      .lean()) as unknown as IUsageSnapshot[];

    if (dailySnaps.length < 7) return { anomalies: [] };

    const anomalies: any[] = [];
    const latest = dailySnaps[0].metrics;

    for (const [metric, currentValue] of Object.entries(latest)) {
      if (metric === "completionRate") continue;
      const values = dailySnaps.slice(1).map(s => s.metrics[metric] || 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sq, v) => sq + (v - mean) ** 2, 0) / values.length);
      const deviation = stdDev > 0 ? (currentValue - mean) / stdDev : 0;

      if (Math.abs(deviation) > 2) {
        anomalies.push({
          metric,
          currentValue,
          expectedValue: Math.round(mean),
          deviation: Math.round(deviation * 10) / 10,
          severity: Math.abs(deviation) > 3 ? "high" : Math.abs(deviation) > 2.5 ? "medium" : "low",
        });
      }
    }

    return { anomalies };
  }

  async getLifecycleOverview(): Promise<{
    total: number; trial: number; active: number; suspended: number; cancelled: number;
    expiringTrials: number; atRisk: number;
  }> {
    const now = new Date();
    const [total, trial, active, suspended, cancelled, expiringTrials, archived] = await Promise.all([
      TenantLifecycle.countDocuments({}),
      TenantLifecycle.countDocuments({ stage: "trial" }),
      TenantLifecycle.countDocuments({ stage: "active" }),
      TenantLifecycle.countDocuments({ stage: "suspended" }),
      TenantLifecycle.countDocuments({ stage: "cancelled" }),
      TenantLifecycle.countDocuments({
        stage: "trial",
        trialEndsAt: { $lte: new Date(now.getTime() + 7 * 86400000), $gte: now },
      }),
      TenantLifecycle.countDocuments({ stage: "archived" }),
    ]);

    return {
      total, trial, active, suspended, cancelled,
      expiringTrials, atRisk: suspended + expiringTrials,
    };
  }
}

export const lifecycleManager = new LifecycleManager();
