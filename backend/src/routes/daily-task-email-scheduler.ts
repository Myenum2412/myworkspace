// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../services/audit.service.js";
import {
  getAuditLogStats,
  getAuditLogs,
  getOrCreateScheduler,
  getSchedulerSettings,
  getUserEmailPreferences,
  retryFailedEmails,
  runDailyTaskEmailScheduler,
  updateSchedulerSettings,
  updateUserEmailPreferences,
} from "../services/daily-task-email-scheduler.service.js";

export default async function plugin(fastify: FastifyInstance) {
// ── Admin Routes ─────────────────────────────────────────────────────

// Get scheduler settings (admin only)
fastify.get("/admin/settings", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }
  if (!user.orgId) throw new AppError(400, "User not associated with an organization");

  const scheduler = await getOrCreateScheduler(user.orgId!);
  reply.send({ data: scheduler });
});

// Update scheduler settings (admin only)
fastify.get("/admin/settings", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const settings = req.body;
  const scheduler = await updateSchedulerSettings(user.orgId!, settings);

  await recordAuditLog({
    orgId: user.orgId!,
    userId: user.userId,
    createdBy: user.userId,
    action: "scheduler.settings_updated",
    entityType: "scheduler",
    entityId: scheduler.id,
    description: "Daily task email scheduler settings updated",
    metadata: JSON.stringify(settings),
  });

  reply.send({ data: scheduler });
});

// Get scheduler stats (admin only)
fastify.get("/admin/stats", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const scheduler = await getSchedulerSettings(user.orgId!);
  const auditStats = await getAuditLogStats(user.orgId!);

  const now = new Date();
  const nextRun = new Date();
  const [hours, minutes] = (scheduler?.sendTime || "08:00").split(":").map(Number);
  nextRun.setHours(hours, minutes, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  reply.send({
    data: {
      enabled: scheduler?.enabled || false,
      paused: scheduler?.paused || false,
      sendTime: scheduler?.sendTime || "08:00",
      timezone: scheduler?.timezone || "UTC",
      lastSuccessfulRun: scheduler?.lastSuccessfulRun,
      lastFailedRun: scheduler?.lastFailedRun,
      lastError: scheduler?.lastError,
      emailsSentToday: scheduler?.emailsSentToday || 0,
      emailsFailedToday: scheduler?.emailsFailedToday || 0,
      totalEmailsSent: scheduler?.totalEmailsSent || 0,
      nextScheduledRun: nextRun,
      auditStats,
    },
  });
});

// Trigger manual run (admin only)
fastify.get("/admin/run", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const results = await runDailyTaskEmailScheduler(user.orgId!);

  await recordAuditLog({
    orgId: user.orgId!,
    userId: user.userId,
    createdBy: user.userId,
    action: "scheduler.manual_run",
    entityType: "scheduler",
    description: "Daily task email scheduler manually triggered",
    metadata: JSON.stringify(results),
  });

  reply.send({ data: results });
});

// Get audit logs (admin only)
fastify.get("/admin/audit-logs", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const logs = await getAuditLogs(user.orgId!, limit, offset);
  const stats = await getAuditLogStats(user.orgId!);

  reply.send({ data: { logs, stats } });
});

// Retry failed emails (admin only)
fastify.get("/admin/retry-failed", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const retriedCount = await retryFailedEmails(user.orgId!);

  reply.send({ data: { retriedCount } });
});

// ── User Routes ──────────────────────────────────────────────────────

// Get user email preferences
fastify.get("/preferences", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  const preferences = await getUserEmailPreferences(user.userId);
  reply.send({ data: preferences });
});

// Update user email preferences
fastify.get("/preferences", authenticate, async (req: AuthRequest, reply: any) => {
  const user = req.user!;
  const preferences = req.body;

  await updateUserEmailPreferences(user.userId, preferences);

  reply.send({ data: { success: true } });
});
}
