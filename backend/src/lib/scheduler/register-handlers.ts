import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger/index.js";
import { jobRegistry } from "./job-registry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Maps the seeded system-job names to the digest handler switch values.
// System jobs are seeded with payload.metadata.subType = system job name,
// so normalize both "notification-hourly-digests" and "hourly" to "hourly".
function normalizeDigestSubType(raw: string): string {
  const map: Record<string, string> = {
    "notification-hourly-digests": "hourly",
    "notification-daily-digests": "daily",
    "notification-weekly-digests": "weekly",
    "notification-unread-reminders": "unread",
    "notification-cleanup-expired": "cleanup",
    "notification-process-snoozed": "snoozed",
  };
  return map[raw] || raw;
}

export function registerAllHandlers(): void {
  jobRegistry.register("session_cleanup", async (payload, jobId, orgId, userId) => {
    const { Session } = await import("../db/models/Session.js");
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const staleSessions = await Session.find({
      logoutTime: { $exists: false },
      updatedAt: { $lt: staleThreshold },
      currentStatus: { $ne: "offline" },
    }).lean();

    if (staleSessions.length === 0) return;

    const now = new Date();
    const bulkOps = staleSessions.map((session: any) => {
      const lastTransition = session.statusTransitions?.[session.statusTransitions.length - 1];
      const breakDuration =
        lastTransition?.status === "break"
          ? now.getTime() - new Date(lastTransition.timestamp).getTime()
          : 0;

      return {
        updateOne: {
          filter: { _id: session._id },
          update: {
            $push: { statusTransitions: { status: "offline", timestamp: now } },
            $set: {
              logoutTime: now,
              currentStatus: "offline",
              totalBreakDuration: (session.totalBreakDuration || 0) + breakDuration,
              duration:
                now.getTime() -
                new Date(session.loginTime).getTime() -
                ((session.totalBreakDuration || 0) + breakDuration),
            },
          },
        },
      };
    });

    await Session.bulkWrite(bulkOps as any);
    logger.info({ count: staleSessions.length }, "Closed stale sessions");
  });

  jobRegistry.register("system_maintenance", async (payload, jobId, orgId, userId) => {
    const { Session } = await import("../db/models/Session.js");
    const { ActivityLog } = await import("../db/models/ActivityLog.js");
    if (!orgId) {
      logger.debug(
        { jobId, type: "system_maintenance" },
        "System maintenance job executed (no org scope)",
      );
      return;
    }

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const sessions = await Session.find({
      orgId,
      loginTime: { $gte: dayStart, $lt: dayEnd },
    }).lean();
    const totalDuration = sessions.reduce((sum, s: any) => sum + (s.duration || 0), 0);
    const activeUsers = new Set(sessions.map((s: any) => s.userId)).size;

    logger.info(
      {
        orgId,
        date: dayStart.toISOString(),
        sessionCount: sessions.length,
        activeUsers,
        totalSeconds: totalDuration,
      },
      "Daily session summary generated",
    );

    await ActivityLog.create({
      orgId,
      userId: userId || "system",
      createdBy: "system",
      action: "session_daily_summary",
      entityType: "session",
      description: `Daily session summary for ${dayStart.toISOString().slice(0, 10)}`,
      metadata: JSON.stringify({
        sessionCount: sessions.length,
        activeUsers,
        totalSeconds: totalDuration,
      }),
      createdAt: now,
    });
  });

  jobRegistry.register("task_due_reminder", async (payload, jobId, orgId, userId) => {
    const { Task } = await import("../db/models/Task.js");
    const { User } = await import("../db/models/User.js");
    const { notifyTaskDueSoon } = await import("../notifications/index.js");
    const { sendTaskDueSoon, sendTaskOverdue } = await import("../mail/index.js");
    const { env } = await import("../../config/env.js");

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tasks = await Task.find({
      dueDate: { $gte: now, $lte: in24h },
      status: { $ne: "completed" },
    }).lean();

    for (const task of tasks) {
      const assigneeId = task.assigneeId?.toString();
      if (!assigneeId) continue;

      const assignee = await User.findById(assigneeId).lean();
      if (!assignee || !assignee.email) continue;

      const dueDate = task.dueDate as Date;
      const msRemaining = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const taskUrl = `${env.APP_URL || "http://localhost:3000"}/alltasks?id=${task.id}`;

      await notifyTaskDueSoon(
        { id: task.id, title: task.title, dueDate },
        assigneeId,
        task.orgId,
        daysRemaining,
      );

      if (daysRemaining <= 0) {
        await sendTaskOverdue(
          assignee.email,
          assignee.name || assignee.email,
          task.title,
          task.project?.toString() || "",
          dueDate.toISOString().split("T")[0],
          Math.abs(daysRemaining) + 1,
          taskUrl,
        );
      } else {
        await sendTaskDueSoon(
          assignee.email,
          assignee.name || assignee.email,
          task.title,
          task.project?.toString() || "",
          dueDate.toISOString().split("T")[0],
          daysRemaining,
          taskUrl,
        );
      }
    }

    logger.info({ count: tasks.length }, "Task due reminders sent");
  });

  jobRegistry.register("file_cleanup", async () => {
    const { runFullCleanup } = await import("../../services/cleanup.service.js");
    const result = await runFullCleanup();
    logger.info({ result }, "File cleanup completed");
  });

  jobRegistry.register("daily_task_email", async () => {
    const { runDailyTaskEmailScheduler } = await import(
      "../../services/daily-task-email-scheduler.service.js"
    );
    const results = await runDailyTaskEmailScheduler();
    logger.info({ results }, "Daily task email scheduler completed");
  });

  jobRegistry.register("notification_digest", async (payload) => {
    const rawSubType = (payload?.metadata as any)?.subType || "hourly";
    const subType = normalizeDigestSubType(rawSubType);
    const {
      processHourlyDigests,
      processDailyDigests,
      processWeeklyDigests,
      processUnreadReminders,
    } = await import("../../services/notification-digest.service.js");
    const { Notification } = await import("../db/models/Notification.js");

    switch (subType) {
      case "hourly":
        await processHourlyDigests();
        break;
      case "daily":
        await processDailyDigests();
        break;
      case "weekly":
        await processWeeklyDigests();
        break;
      case "unread":
        await processUnreadReminders();
        break;
      case "cleanup": {
        const result = await Notification.deleteMany({ expiresAt: { $lte: new Date() } });
        if (result.deletedCount > 0) {
          logger.info({ deletedCount: result.deletedCount }, "Cleaned up expired notifications");
        }
        break;
      }
      case "snoozed": {
        const snoozed = await Notification.find({
          snoozedUntil: { $lte: new Date(), $ne: null },
          archived: { $ne: true },
        }).lean();
        for (const n of snoozed) {
          await Notification.updateOne({ _id: n._id }, { $unset: { snoozedUntil: "" } });
        }
        if (snoozed.length > 0) {
          logger.info({ count: snoozed.length }, "Snoozed notifications reactivated");
        }
        break;
      }
      default:
        logger.warn({ subType }, "Unknown notification digest sub-type");
    }
  });

  jobRegistry.register("backup_scheduled", async () => {
    const { execSync } = await import("child_process");
    const { existsSync } = await import("fs");
    try {
      // Resolve scripts/backup-db.sh from the project root (repo root, not backend dist).
      const candidates = [
        path.resolve(process.cwd(), "scripts", "backup-db.sh"),
        path.resolve(process.cwd(), "..", "scripts", "backup-db.sh"),
        path.resolve(__dirname, "..", "..", "..", "scripts", "backup-db.sh"),
      ];
      const script = candidates.find((c) => existsSync(c));
      if (!script) {
        logger.error({ candidates }, "backup-db.sh not found — database backup skipped");
        return;
      }
      execSync(`bash "${script}"`, { timeout: 600000, env: process.env });
      logger.info("Database backup completed");
    } catch (err: any) {
      logger.error({ err }, "Database backup failed");
    }
  });

  jobRegistry.register("analytics_aggregation", async () => {
    const { AnalyticsEvent } = await import("../db/models/AnalyticsEvent.js");
    const { ActivityLog } = await import("../db/models/ActivityLog.js");

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

    const events = await AnalyticsEvent.find({ timestamp: { $gte: dayStart, $lt: dayEnd } }).lean();

    const byCategory: Record<string, number> = {};
    const byName: Record<string, number> = {};
    for (const e of events as any[]) {
      byCategory[e.eventCategory] = (byCategory[e.eventCategory] || 0) + 1;
      byName[e.eventName] = (byName[e.eventName] || 0) + 1;
    }

    logger.info(
      {
        date: dayStart.toISOString().slice(0, 10),
        totalEvents: events.length,
        byCategory,
        topEvents: Object.entries(byName)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10),
      },
      "Analytics aggregation completed",
    );

    if (events.length > 0) {
      await ActivityLog.create({
        orgId: "system",
        userId: "system",
        createdBy: "system",
        action: "analytics_daily_aggregation",
        entityType: "analytics_event",
        description: `Analytics aggregation for ${dayStart.toISOString().slice(0, 10)}`,
        metadata: JSON.stringify({ totalEvents: events.length, byCategory }),
        createdAt: now,
      });
    }
  });

  jobRegistry.register("log_rotation", async () => {
    const { EmailLog } = await import("../db/models/EmailLog.js");
    const { ActivityLog } = await import("../db/models/ActivityLog.js");
    const { ClientAuditLog } = await import("../db/models/ClientAuditLog.js");
    const { ConsentAuditLog } = await import("../db/models/ConsentAuditLog.js");
    const { AnalyticsEvent } = await import("../db/models/AnalyticsEvent.js");

    const now = new Date();
    const DAY = 24 * 60 * 60 * 1000;

    const purge = async (
      model: {
        deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount?: number }>;
      },
      label: string,
      before: Date,
    ) => {
      const res = await model.deleteMany({ createdAt: { $lt: before } });
      logger.info(
        { collection: label, deleted: res.deletedCount || 0 },
        "Log rotation purged collection",
      );
    };

    // Retention windows
    const emailLogsBefore = new Date(now.getTime() - 30 * DAY);
    const activityBefore = new Date(now.getTime() - 90 * DAY);
    const clientAuditBefore = new Date(now.getTime() - 365 * DAY);
    const consentBefore = new Date(now.getTime() - 365 * DAY);
    const analyticsBefore = new Date(now.getTime() - 180 * DAY);

    await Promise.all([
      purge(EmailLog, "email_logs", emailLogsBefore),
      purge(ActivityLog, "activity_logs", activityBefore),
      purge(ClientAuditLog, "client_audit_logs", clientAuditBefore),
      purge(ConsentAuditLog, "consent_audit_logs", consentBefore),
      purge(AnalyticsEvent, "analytics_events", analyticsBefore),
    ]);
  });

  jobRegistry.register("repeat_task_generation", async () => {
    const { Task } = await import("../db/models/Task.js");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const repeatTemplates = await Task.find({
      repeatType: { $in: ["daily", "weekly"] },
      isActive: { $ne: false },
      $or: [
        { repeatEndDate: { $exists: false } },
        { repeatEndDate: null },
        { repeatEndDate: { $gte: now } },
      ],
    }).lean();

    let created = 0;
    let skipped = 0;

    for (const template of repeatTemplates) {
      const repeatStart = template.repeatStartDate ? new Date(template.repeatStartDate) : null;
      if (repeatStart && repeatStart > now) {
        skipped++;
        continue;
      }

      const lastGenerated = template.lastRepeatGeneratedAt
        ? new Date(template.lastRepeatGeneratedAt)
        : null;

      let shouldGenerate = false;

      if (template.repeatType === "daily") {
        const todayStr = todayStart.toISOString().slice(0, 10);
        const lastGenStr = lastGenerated ? lastGenerated.toISOString().slice(0, 10) : null;
        shouldGenerate = lastGenStr !== todayStr;
      } else if (template.repeatType === "weekly" && repeatStart) {
        const daysSinceStart = Math.floor(
          (now.getTime() - repeatStart.getTime()) / (1000 * 60 * 60 * 24),
        );
        const currentWeekIndex = Math.floor(daysSinceStart / 7);
        if (lastGenerated) {
          const lastGenWeekIndex = Math.floor(
            (lastGenerated.getTime() - repeatStart.getTime()) / (1000 * 60 * 60 * 24) / 7,
          );
          shouldGenerate = lastGenWeekIndex < currentWeekIndex;
        } else {
          shouldGenerate = true;
        }
      }

      if (!shouldGenerate) {
        skipped++;
        continue;
      }

      await Task.create({
        orgId: template.orgId,
        type: template.type,
        teamId: template.teamId,
        assigneeId: template.assigneeId,
        creatorId: template.creatorId,
        createdBy: template.createdBy,
        title: template.title,
        description: template.description,
        project: template.project,
        status: "assigned",
        priority: template.priority || "medium",
        selectedUserIds: template.selectedUserIds,
        isSaved: false,
        isActive: true,
      });

      await Task.updateOne({ _id: template._id }, { $set: { lastRepeatGeneratedAt: now } });

      created++;
    }

    logger.info(
      { created, skipped, total: repeatTemplates.length },
      "Repeated task instances generated",
    );
  });

  jobRegistry.register("calendar_sync", async () => {
    const { runScheduledSync } = await import("../../services/calendar-sync.service.js");
    try {
      await runScheduledSync();
      logger.info("Scheduled calendar sync completed");
    } catch (err: any) {
      logger.error({ err }, "Scheduled calendar sync failed");
    }
  });

  const emptyHandlers: string[] = [];
  for (const type of emptyHandlers) {
    jobRegistry.register(type as any, async () => {
      logger.debug({ type }, "Placeholder handler - no implementation");
    });
  }

  logger.info("All system job handlers registered with JobScheduler.NET");
}
