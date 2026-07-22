import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import {
  getOrCreateScheduler,
  updateSchedulerSettings,
  getSchedulerSettings,
  runDailyTaskEmailScheduler,
  getAuditLogs,
  getAuditLogStats,
  retryFailedEmails,
  getUserEmailPreferences,
  updateUserEmailPreferences,
} from "../services/daily-task-email-scheduler.service.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();

// ── Admin Routes ─────────────────────────────────────────────────────

// Get scheduler settings (admin only)
router.get("/admin/settings", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const scheduler = await getOrCreateScheduler(user.orgId);
  res.json({ data: scheduler });
});

// Update scheduler settings (admin only)
router.put("/admin/settings", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const settings = req.body;
  const scheduler = await updateSchedulerSettings(user.orgId, settings);

  await recordAuditLog({
    orgId: user.orgId,
    userId: user.userId,
    createdBy: user.userId,
    action: "scheduler.settings_updated",
    entityType: "scheduler",
    entityId: scheduler.id,
    description: "Daily task email scheduler settings updated",
    metadata: JSON.stringify(settings),
  });

  res.json({ data: scheduler });
});

// Get scheduler stats (admin only)
router.get("/admin/stats", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const scheduler = await getSchedulerSettings(user.orgId);
  const auditStats = await getAuditLogStats(user.orgId);

  const now = new Date();
  const nextRun = new Date();
  const [hours, minutes] = (scheduler?.sendTime || "08:00").split(":").map(Number);
  nextRun.setHours(hours, minutes, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  res.json({
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
router.post("/admin/run", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const results = await runDailyTaskEmailScheduler(user.orgId);

  await recordAuditLog({
    orgId: user.orgId,
    userId: user.userId,
    createdBy: user.userId,
    action: "scheduler.manual_run",
    entityType: "scheduler",
    description: "Daily task email scheduler manually triggered",
    metadata: JSON.stringify(results),
  });

  res.json({ data: results });
});

// Get audit logs (admin only)
router.get("/admin/audit-logs", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const logs = await getAuditLogs(user.orgId, limit, offset);
  const stats = await getAuditLogStats(user.orgId);

  res.json({ data: { logs, stats } });
});

// Retry failed emails (admin only)
router.post("/admin/retry-failed", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  if (user.role !== "org_admin" && user.role !== "members") {
    throw new AppError(403, "Forbidden: Admin access required");
  }

  const retriedCount = await retryFailedEmails(user.orgId);

  res.json({ data: { retriedCount } });
});

// ── User Routes ──────────────────────────────────────────────────────

// Get user email preferences
router.get("/preferences", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const preferences = await getUserEmailPreferences(user.userId);
  res.json({ data: preferences });
});

// Update user email preferences
router.put("/preferences", authenticate, async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const preferences = req.body;

  await updateUserEmailPreferences(user.userId, preferences);

  res.json({ data: { success: true } });
});

export default router;
