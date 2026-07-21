import { EventEmitter } from "events";
import { logger } from "../lib/logger/index.js";
import { Notification } from "../lib/db/models/Notification.js";
import { EmailLog } from "../lib/db/models/EmailLog.js";

export interface NotificationMetric {
  type: string;
  category: string;
  channel: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  userId: string;
  orgId: string;
  correlationId?: string;
  error?: string;
}

class NotificationMetrics extends EventEmitter {
  private metrics: NotificationMetric[] = [];
  private readonly maxMetrics = 10000;
  private counters: Map<string, number> = new Map();
  private errorCounters: Map<string, number> = new Map();

  record(metric: NotificationMetric): void {
    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    const counterKey = `${metric.channel}:${metric.type}`;
    this.counters.set(counterKey, (this.counters.get(counterKey) || 0) + 1);

    if (!metric.success) {
      const errorKey = `${metric.channel}:${metric.type}:${metric.error || "unknown"}`;
      this.errorCounters.set(errorKey, (this.errorCounters.get(errorKey) || 0) + 1);
    }

    this.emit("notification", metric);
  }

  getStats(): Record<string, any> {
    const totalSent = [...this.counters.values()].reduce((a, b) => a + b, 0);
    const totalErrors = [...this.errorCounters.values()].reduce((a, b) => a + b, 0);

    return {
      totalSent,
      totalErrors,
      errorRate: totalSent > 0 ? (totalErrors / totalSent * 100).toFixed(2) + "%" : "0%",
      channels: Object.fromEntries(this.counters),
      errors: Object.fromEntries(this.errorCounters),
      recentMetrics: this.metrics.slice(-100),
    };
  }

  async getAggregatedStats(orgId?: string, days = 30): Promise<Record<string, any>> {
    const since = new Date(Date.now() - days * 86400000);

    const [totalNotifs, sentEmails, failedEmails, byType, byCategory] = await Promise.all([
      Notification.countDocuments(orgId ? { orgId, createdAt: { $gte: since } } : { createdAt: { $gte: since } }),
      EmailLog.countDocuments({ status: "sent", createdAt: { $gte: since }, ...(orgId ? { orgId } : {}) }),
      EmailLog.countDocuments({ status: "failed", createdAt: { $gte: since }, ...(orgId ? { orgId } : {}) }),
      Notification.aggregate([
        { $match: { createdAt: { $gte: since }, ...(orgId ? { orgId } : {}) } },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Notification.aggregate([
        { $match: { createdAt: { $gte: since }, ...(orgId ? { orgId } : {}) } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return {
      period: { days, since },
      totalNotifications: totalNotifs,
      emailsSent: sentEmails,
      emailsFailed: failedEmails,
      emailSuccessRate: sentEmails > 0
        ? ((sentEmails / (sentEmails + failedEmails)) * 100).toFixed(1) + "%"
        : "N/A",
      topTypes: byType,
      byCategory,
      inMemory: this.getStats(),
    };
  }
}

export const notificationMetrics = new NotificationMetrics();
