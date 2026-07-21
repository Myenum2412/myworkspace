import { logger } from "../lib/logger/index.js";
import { connection } from "mongoose";
import { isRabbitMQConfigured, getChannel } from "../lib/queue/connection.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { Notification } from "../lib/db/models/Notification.js";
import { EmailLog } from "../lib/db/models/EmailLog.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { env } from "../config/env.js";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: Record<string, { status: string; latency: number; error?: string }>;
  summary: Record<string, any>;
}

export async function checkNotificationHealth(): Promise<HealthStatus> {
  const checks: Record<string, { status: string; latency: number; error?: string }> = {};
  const startTime = Date.now();

  // Database check
  try {
    const dbStart = Date.now();
    const dbState = connection.readyState;
    checks.database = {
      status: dbState === 1 ? "healthy" : "unhealthy",
      latency: Date.now() - dbStart,
      error: dbState !== 1 ? `Mongoose state: ${dbState}` : undefined,
    };
  } catch (err: any) {
    checks.database = { status: "unhealthy", latency: 0, error: err.message };
  }

  // Queue check
  try {
    const queueStart = Date.now();
    if (isRabbitMQConfigured()) {
      const ch = await getChannel();
      checks.messageQueue = {
        status: ch ? "healthy" : "degraded",
        latency: Date.now() - queueStart,
        error: ch ? undefined : "Channel not available",
      };
    } else {
      checks.messageQueue = {
        status: "disabled",
        latency: 0,
      };
    }
  } catch (err: any) {
    checks.messageQueue = { status: "unhealthy", latency: 0, error: err.message };
  }

  // SMTP check
  try {
    const smtpStart = Date.now();
    const smtpConfigured = !!(env.SMTP_HOST || env.RESEND_API_KEY);
    checks.smtp = {
      status: smtpConfigured ? "healthy" : "disabled",
      latency: Date.now() - smtpStart,
      error: smtpConfigured ? undefined : "No SMTP or Resend configured",
    };
  } catch (err: any) {
    checks.smtp = { status: "unhealthy", latency: 0, error: err.message };
  }

  // VAPID check (Web Push)
  try {
    checks.vapid = {
      status: env.VAPID_PUBLIC_KEY ? "healthy" : "disabled",
      latency: 0,
      error: env.VAPID_PUBLIC_KEY ? undefined : "VAPID keys not configured",
    };
  } catch (err: any) {
    checks.vapid = { status: "unhealthy", latency: 0, error: err.message };
  }

  // Notification counts (recent)
  try {
    const countStart = Date.now();
    const oneHourAgo = new Date(Date.now() - 3600000);
    const [recentCount, failedCount, pendingEmails] = await Promise.all([
      Notification.countDocuments({ createdAt: { $gte: oneHourAgo } }),
      EmailLog.countDocuments({ status: "failed", createdAt: { $gte: oneHourAgo } }),
      EmailLog.countDocuments({ status: "queued" }),
    ]);

    checks.recentActivity = {
      status: "healthy",
      latency: Date.now() - countStart,
    };

    const overallStatus: HealthStatus["status"] =
      checks.database.status === "unhealthy" ? "unhealthy" :
      failedCount > 50 ? "degraded" :
      "healthy";

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        notificationsLastHour: recentCount,
        failedEmailsLastHour: failedCount,
        pendingEmails: pendingEmails,
      },
    };
  } catch (err: any) {
    checks.recentActivity = { status: "error", latency: 0, error: err.message };
    return {
      status: "degraded",
      timestamp: new Date().toISOString(),
      checks,
      summary: { error: err.message },
    };
  }
}
