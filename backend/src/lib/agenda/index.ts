import { Agenda } from "agenda";
import { MongoBackend } from "@agendajs/mongo-backend";
import { env } from "../../config/env.js";
import { Session } from "../db/models/Session.js";
import { Task } from "../db/models/Task.js";
import { User } from "../db/models/User.js";
import { notifyTaskDueSoon } from "../notifications/index.js";
import { sendTaskDueSoon, sendTaskOverdue } from "../mail/index.js";

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

  console.log("✦ Agenda.js scheduler initialized");
  return agenda;
}

export function getAgenda(): Agenda | null {
  return agenda;
}
