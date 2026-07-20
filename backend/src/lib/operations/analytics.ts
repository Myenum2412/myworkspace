import { Schema, model, Document } from "mongoose";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

export interface IOperationEvent extends Document {
  eventType: string;
  category: "performance" | "error" | "security" | "business" | "infrastructure";
  severity: "info" | "warning" | "critical";
  source: string;
  data: Record<string, unknown>;
  timestamp: Date;
  ttl: number;
}

const operationEventSchema = new Schema<IOperationEvent>({
  eventType: { type: String, required: true, index: true },
  category: {
    type: String, enum: ["performance", "error", "security", "business", "infrastructure"],
    required: true, index: true,
  },
  severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
  source: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, default: Date.now, index: true },
  ttl: { type: Number, default: 7 * 24 * 60 * 60 },
});

operationEventSchema.index({ category: 1, severity: 1, timestamp: -1 });

export const OperationEvent = model<IOperationEvent>("OperationEvent", operationEventSchema);

export class OperationalAnalytics {
  async recordEvent(
    eventType: string,
    category: IOperationEvent["category"],
    data: Record<string, unknown>,
    severity: IOperationEvent["severity"] = "info",
    source = "system",
  ): Promise<void> {
    try {
      await OperationEvent.create({
        eventType, category, severity, source, data, timestamp: new Date(),
      });
    } catch (err) {
      logger.warn({ err, eventType }, "Failed to record operation event");
    }
  }

  async recordPerformance(operation: string, durationMs: number, meta: Record<string, unknown> = {}) {
    metricsRegistry.observeHistogram("operation_duration_ms", { operation }, durationMs);
    if (durationMs > 10000) {
      await this.recordEvent("slow_operation", "performance", {
        operation, durationMs, ...meta,
      }, "warning", "perf-monitor");
    }
  }

  async recordError(errorType: string, error: Error, meta: Record<string, unknown> = {}) {
    await this.recordEvent(errorType, "error", {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      ...meta,
    }, "warning", "error-monitor");
  }

  async recordSecurityEvent(eventType: string, data: Record<string, unknown>) {
    await this.recordEvent(eventType, "security", data, "critical", "security-monitor");
  }

  async getRecentEvents(
    category?: string,
    limit = 50,
    severity?: string,
  ): Promise<any[]> {
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    return OperationEvent.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
  }

  async getCategoryCounts(since: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)) {
    return OperationEvent.aggregate([
      { $match: { timestamp: { $gte: since } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
  }

  async detectAnomalies(): Promise<Array<{
    type: string;
    metric: string;
    currentValue: number;
    threshold: number;
    severity: string;
  }>> {
    const anomalies: Array<{
      type: string; metric: string; currentValue: number;
      threshold: number; severity: string;
    }> = [];

    const recentErrors = await OperationEvent.countDocuments({
      category: "error",
      timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });
    if (recentErrors > 50) {
      anomalies.push({
        type: "error_rate",
        metric: "errors_15min",
        currentValue: recentErrors,
        threshold: 50,
        severity: "critical",
      });
    }

    const slowOps = await OperationEvent.countDocuments({
      eventType: "slow_operation",
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
    });
    if (slowOps > 10) {
      anomalies.push({
        type: "performance",
        metric: "slow_operations_5min",
        currentValue: slowOps,
        threshold: 10,
        severity: "warning",
      });
    }

    return anomalies;
  }

  async cleanupOldEvents(retentionHours = 168): Promise<number> {
    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);
    const result = await OperationEvent.deleteMany({ timestamp: { $lt: cutoff } });
    if (result.deletedCount > 0) {
      logger.info({ deleted: result.deletedCount, retentionHours }, "Cleaned up old operation events");
    }
    return result.deletedCount;
  }
}

export const operationalAnalytics = new OperationalAnalytics();
