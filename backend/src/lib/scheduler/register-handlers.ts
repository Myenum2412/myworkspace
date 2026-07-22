import { jobRegistry } from "./job-registry.js";
import { logger } from "../logger/index.js";

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
      const breakDuration = lastTransition?.status === "break"
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
              duration: now.getTime() - new Date(session.loginTime).getTime() - ((session.totalBreakDuration || 0) + breakDuration),
            },
          },
        },
      };
    });

    await Session.bulkWrite(bulkOps as any);
    logger.info({ count: staleSessions.length }, "Closed stale sessions");
  });

  jobRegistry.register("system_maintenance", async (payload, jobId, orgId, userId) => {
    logger.debug({ jobId, type: "system_maintenance" }, "System maintenance job executed");
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
        daysRemaining
      );

      if (daysRemaining <= 0) {
        await sendTaskOverdue(
          assignee.email,
          assignee.name || assignee.email,
          task.title,
          task.project?.toString() || "",
          dueDate.toISOString().split("T")[0],
          Math.abs(daysRemaining) + 1,
          taskUrl
        );
      } else {
        await sendTaskDueSoon(
          assignee.email,
          assignee.name || assignee.email,
          task.title,
          task.project?.toString() || "",
          dueDate.toISOString().split("T")[0],
          daysRemaining,
          taskUrl
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
    const { runDailyTaskEmailScheduler } = await import("../../services/daily-task-email-scheduler.service.js");
    const results = await runDailyTaskEmailScheduler();
    logger.info({ results }, "Daily task email scheduler completed");
  });

  jobRegistry.register("notification_digest", async (payload) => {
    const subType = (payload?.metadata as any)?.subType || "hourly";
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
      case "cleanup":
        const result = await Notification.deleteMany({ expiresAt: { $lte: new Date() } });
        if (result.deletedCount > 0) {
          logger.info({ deletedCount: result.deletedCount }, "Cleaned up expired notifications");
        }
        break;
      case "snoozed":
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
      default:
        logger.warn({ subType }, "Unknown notification digest sub-type");
    }
  });

  jobRegistry.register("backup_scheduled", async () => {
    const { execSync } = await import("child_process");
    try {
      execSync("node scripts/backup-db.sh", { timeout: 300000 });
      logger.info("Database backup completed");
    } catch (err: any) {
      logger.error({ err }, "Database backup failed");
    }
  });

  jobRegistry.register("analytics_aggregation", async () => {
    logger.info("Analytics aggregation triggered");
  });

  jobRegistry.register("log_rotation", async () => {
    logger.info("Log rotation triggered");
  });

  const emptyHandlers: string[] = [];
  for (const type of emptyHandlers) {
    jobRegistry.register(type as any, async () => {
      logger.debug({ type }, "Placeholder handler - no implementation");
    });
  }

  logger.info("All system job handlers registered with JobScheduler.NET");
}
