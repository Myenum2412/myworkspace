import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { env } from "../../config/env.js";
import { Session } from "../db/models/Session.js";
import { Task } from "../db/models/Task.js";
import { User } from "../db/models/User.js";
import { notifyTaskDueSoon } from "../notifications/index.js";
import { sendTaskDueSoon, sendTaskOverdue } from "../mail/index.js";
import { setupNotificationJobs } from "./notification-jobs.js";

let agenda: Agenda | null = null;

export async function initializeAgenda() {
  const backend = new MongoBackend({
    address: env.MONGODB_URI,
    collection: "agenda_jobs",
    options: {
      tls: true,
      tlsAllowInvalidCertificates: true,
    },
  });

  agenda = new Agenda({
    backend,
    defaultConcurrency: 5,
    defaultLockLifetime: 60000,
  });

  agenda.define("close-stale-sessions", async (job: any, done: any) => {
    const staleThreshold = new Date(Date.now() - 30 * 60 * 1000);
    const staleSessions = await Session.find({
      logoutTime: { $exists: false },
      updatedAt: { $lt: staleThreshold },
      currentStatus: { $ne: "offline" },
    }).lean();

    if (staleSessions.length === 0) { done(); return; }

    const now = new Date();
    const bulkOps = staleSessions.map((session) => {
      const lastTransition = session.statusTransitions?.[session.statusTransitions.length - 1];
      const breakDuration = lastTransition?.status === "break"
        ? now.getTime() - new Date(lastTransition.timestamp).getTime()
        : 0;

      return {
        updateOne: {
          filter: { _id: session._id },
          update: {
            $push: { statusTransitions: { status: "offline" as const, timestamp: now } },
            $set: {
              logoutTime: now,
              currentStatus: "offline" as const,
              totalBreakDuration: (session.totalBreakDuration || 0) + breakDuration,
              duration: now.getTime() - new Date(session.loginTime).getTime() - ((session.totalBreakDuration || 0) + breakDuration),
            },
          },
        },
      };
    });

    await Session.bulkWrite(bulkOps);
    console.log(`✦ Agenda: closed ${staleSessions.length} stale session(s)`);
    done();
  });

  agenda.define("session-daily-report", async (job: any, done: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sessions = await Session.find({
      loginTime: { $gte: today, $lt: tomorrow },
    })
      .populate("userId", "name email")
      .lean();

    if (sessions.length > 0) {
      console.log(`✦ Agenda: daily session report - ${sessions.length} session(s) today`);
      for (const s of sessions) {
        console.log(`  - ${(s.userId as any)?.name || s.userId}: ${Math.round((s.duration || 0) / 60000)} min active`);
      }
    }
    done();
  });

  await agenda.start();

  // ─── File Processing Jobs ─────────────────────────────────────────────

  agenda.define("generate-file-thumbnails", async (job: any, done: any) => {
    try {
      const { fileId } = job.attrs.data || {};
      if (!fileId) { done(); return; }
      const { generateThumbnail } = await import("../../services/thumbnail.service.js");
      const { FileAttachment } = await import("../db/models/FileAttachment.js");
      const file = await FileAttachment.findOne({ id: fileId }).lean();
      if (file) {
        await generateThumbnail(fileId, file.orgId);
        console.log(`✦ Agenda: generated thumbnails for ${fileId}`);
      }
      done();
    } catch (err) {
      console.error("[agenda] generate-file-thumbnails error:", err);
      done(err as Error);
    }
  });

  agenda.define("extract-file-metadata", async (job: any, done: any) => {
    try {
      const { fileId } = job.attrs.data || {};
      if (!fileId) { done(); return; }
      const { extractFileMetadata } = await import("../../services/metadata.service.js");
      const { FileAttachment } = await import("../db/models/FileAttachment.js");
      const file = await FileAttachment.findOne({ id: fileId }).lean();
      if (file) {
        await extractFileMetadata(fileId, file.orgId);
        console.log(`✦ Agenda: extracted metadata for ${fileId}`);
      }
      done();
    } catch (err) {
      console.error("[agenda] extract-file-metadata error:", err);
      done(err as Error);
    }
  });

  agenda.define("cleanup-files", async (_job: any, done: any) => {
    try {
      const { runFullCleanup } = await import("../../services/cleanup.service.js");
      const result = await runFullCleanup();
      console.log(`✦ Agenda: cleanup complete`, result);
      done();
    } catch (err) {
      console.error("[agenda] cleanup-files error:", err);
      done(err as Error);
    }
  });

  agenda.define("task-due-reminders", async (job: any, done: any) => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tasks = await Task.find({
        dueDate: { $gte: now, $lte: in24h },
        status: { $ne: "completed" },
      }).lean();

      if (tasks.length === 0) { done(); return; }

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

      console.log(`✦ Agenda: sent ${tasks.length} task reminder(s)`);
      done();
    } catch (err) {
      console.error("[agenda] task-due-reminders error:", err);
      done(err as Error);
    }
  });

  await agenda.every("15 minutes", "close-stale-sessions");
  await agenda.every("0 0 * * *", "session-daily-report");
  await agenda.every("*/30 * * * *", "task-due-reminders");
  await agenda.every("0 */6 * * *", "cleanup-files");

  // Daily task email scheduler - runs every hour to check for orgs that need to send emails
  agenda.define("daily-task-email-scheduler", async (job: any, done: any) => {
    try {
      const { runDailyTaskEmailScheduler } = await import("../../services/daily-task-email-scheduler.service.js");
      const results = await runDailyTaskEmailScheduler();
      console.log(`✦ Agenda: daily task email scheduler completed - ${results.success} sent, ${results.failed} failed, ${results.skipped} skipped`);
      done();
    } catch (err) {
      console.error("[agenda] daily-task-email-scheduler error:", err);
      done(err as Error);
    }
  });

  // Run every hour to check for scheduled emails
  await agenda.every("0 * * * *", "daily-task-email-scheduler");

  // Register notification jobs
  setupNotificationJobs(agenda);

  console.log("✦ Agenda.js scheduler initialized");
  return agenda;
}

export function getAgenda(): Agenda | null {
  return agenda;
}
