import { Router, Request, Response } from "express";
import { logger } from "../lib/logger/index.js";

const CRON_SECRET = process.env.CRON_SECRET || "JmJ+4jtfj0b9PE6dy01ZttLiFgsw3NK/qs2aTNKNDjU=";

const router = Router();

function authenticate(req: Request, res: Response, next: () => void) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ") || auth.slice(7) !== CRON_SECRET) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  next();
}

router.use(authenticate);

router.get("/process-reminders", async (_req: Request, res: Response) => {
  try {
    const { Task } = await import("../lib/db/models/Task.js");
    const { User } = await import("../lib/db/models/User.js");
    const { notifyTaskDueSoon } = await import("../lib/notifications/index.js");
    const { sendTaskDueSoon, sendTaskOverdue } = await import("../lib/mail/index.js");
    const { env } = await import("../config/env.js");

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tasks = await Task.find({
      dueDate: { $gte: now, $lte: in24h },
      status: { $ne: "completed" },
    }).lean();

    let sent = 0;
    let failed = 0;

    for (const task of tasks) {
      const assigneeId = task.assigneeId?.toString();
      if (!assigneeId) continue;

      const assignee = await User.findById(assigneeId).lean();
      if (!assignee || !assignee.email) continue;

      const dueDate = task.dueDate as Date;
      const msRemaining = dueDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      const taskUrl = `${env.APP_URL || "http://localhost:3000"}/alltasks?id=${task.id}`;

      try {
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
        sent++;
      } catch (err) {
        failed++;
        logger.error({ err, taskId: task.id }, "Failed to send reminder for task");
      }
    }

    logger.info({ sent, failed, total: tasks.length }, "Task reminders processed via cron-job.org");

    res.json({
      success: true,
      data: { processed: tasks.length, sent, failed },
    });
  } catch (err: any) {
    logger.error({ err }, "Cron reminder processing failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/morning-reminder", async (_req: Request, res: Response) => {
  try {
    const { Task } = await import("../lib/db/models/Task.js");
    const { User } = await import("../lib/db/models/User.js");
    const { OrgMember } = await import("../lib/db/models/OrgMember.js");
    const { createNotification } = await import("../services/notification.service.js");
    const { env } = await import("../config/env.js");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const orgs = await OrgMember.distinct("orgId");
    let totalUsers = 0;
    let totalTasks = 0;
    let notified = 0;

    for (const orgId of orgs) {
      const members = await OrgMember.find({ orgId }).lean();
      const userIds = members.map((m: any) => m.userId?.toString()).filter(Boolean);

      for (const uid of userIds) {
        const tasks = await Task.find({
          orgId,
          assigneeId: uid,
          dueDate: { $gte: todayStart, $lt: todayEnd },
          status: { $ne: "completed" },
        }).lean();

        if (tasks.length === 0) continue;
        totalTasks += tasks.length;
        totalUsers++;

        const user = await User.findById(uid).lean();
        if (!user || !user.email) continue;

        const taskUrl = `${env.APP_URL || "http://localhost:3000"}/alltasks`;
        const dashboardUrl = `${env.APP_URL || "http://localhost:3000"}/dashboard`;

        await createNotification({
          userId: uid,
          orgId,
          createdBy: uid,
          type: "task_due_soon",
          title: `Good Morning! You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} due today`,
          message: tasks.map((t: any) => `• ${t.title}${t.dueDate ? ` (by ${new Date(t.dueDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})` : ""}`).join("\n"),
          priority: "medium",
          correlationId: `morning-reminder-${uid}-${todayStart.getTime()}`,
        });

        const { sendEmail } = await import("../lib/mail/sender.js");
        const { buildEmailHtml } = await import("../lib/mail/templates/builder.js");
        const taskList = tasks.map((t: any) =>
          `• ${t.title}${t.dueDate ? ` — Due: ${new Date(t.dueDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}`
        ).join("<br>");

        await sendEmail(
          user.email,
          `☀️ Good Morning — ${tasks.length} Task${tasks.length > 1 ? "s" : ""} Due Today`,
          buildEmailHtml({
            subject: `Good Morning, ${user.name || "there"}!`,
            previewText: `You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} due today`,
            greeting: `☀️ Good Morning, ${user.name || "there"}!`,
            intro: [`Here are your tasks due <strong>today</strong>:`, taskList],
            button: { text: "View All Tasks", url: taskUrl },
            outro: ["Have a productive day!"],
            supportEmail: "support@myenum.in",
          })
        );

        notified++;
      }
    }

    logger.info({ notified, totalUsers, totalTasks }, "Morning reminders sent");

    res.json({
      success: true,
      data: { notified, users: totalUsers, tasks: totalTasks },
    });
  } catch (err: any) {
    logger.error({ err }, "Morning reminder processing failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/evening-reminder", async (_req: Request, res: Response) => {
  try {
    const { Task } = await import("../lib/db/models/Task.js");
    const { User } = await import("../lib/db/models/User.js");
    const { OrgMember } = await import("../lib/db/models/OrgMember.js");
    const { createNotification } = await import("../services/notification.service.js");
    const { env } = await import("../config/env.js");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);

    const orgs = await OrgMember.distinct("orgId");
    let totalUsers = 0;
    let totalOverdue = 0;
    let totalTomorrow = 0;
    let notified = 0;

    for (const orgId of orgs) {
      const members = await OrgMember.find({ orgId }).lean();
      const userIds = members.map((m: any) => m.userId?.toString()).filter(Boolean);

      for (const uid of userIds) {
        const overdue = await Task.find({
          orgId,
          assigneeId: uid,
          dueDate: { $lt: now },
          status: { $nin: ["completed", "cancelled", "closed"] },
        }).lean();

        const tomorrowTasks = await Task.find({
          orgId,
          assigneeId: uid,
          dueDate: { $gte: tomorrowStart, $lt: tomorrowEnd },
          status: { $ne: "completed" },
        }).lean();

        if (overdue.length === 0 && tomorrowTasks.length === 0) continue;
        totalOverdue += overdue.length;
        totalTomorrow += tomorrowTasks.length;
        totalUsers++;

        const user = await User.findById(uid).lean();
        if (!user || !user.email) continue;

        const taskUrl = `${env.APP_URL || "http://localhost:3000"}/alltasks`;

        let notificationParts: string[] = [];
        if (overdue.length > 0) {
          notificationParts.push(`Overdue (${overdue.length}):`);
          notificationParts.push(...overdue.map((t: any) => `  • ${t.title}`));
        }
        if (tomorrowTasks.length > 0) {
          notificationParts.push(`Due tomorrow (${tomorrowTasks.length}):`);
          notificationParts.push(...tomorrowTasks.map((t: any) => `  • ${t.title}`));
        }

        await createNotification({
          userId: uid,
          orgId,
          createdBy: uid,
          type: "task_due_soon",
          title: `Evening Recap${overdue.length > 0 ? ` — ${overdue.length} overdue` : ""}${tomorrowTasks.length > 0 ? `, ${tomorrowTasks.length} due tomorrow` : ""}`,
          message: notificationParts.join("\n"),
          priority: "medium",
          correlationId: `evening-reminder-${uid}-${todayStart.getTime()}`,
        });

        const { sendEmail } = await import("../lib/mail/sender.js");
        const { buildEmailHtml } = await import("../lib/mail/templates/builder.js");

        let introLines: string[] = [];
        if (overdue.length > 0) {
          introLines.push(`<strong>⚠️ Overdue Tasks (${overdue.length}):</strong>`);
          introLines.push(overdue.map((t: any) => `• ${t.title} — Overdue`).join("<br>"));
        }
        if (tomorrowTasks.length > 0) {
          introLines.push(`<strong>📅 Due Tomorrow (${tomorrowTasks.length}):</strong>`);
          introLines.push(tomorrowTasks.map((t: any) => `• ${t.title}`).join("<br>"));
        }

        await sendEmail(
          user.email,
          `🌆 Evening Recap${overdue.length > 0 ? ` — ${overdue.length} overdue` : ""}${tomorrowTasks.length > 0 ? `, ${tomorrowTasks.length} due tomorrow` : ""}`,
          buildEmailHtml({
            subject: `Evening Recap — ${overdue.length} overdue, ${tomorrowTasks.length} due tomorrow`,
            previewText: `You have ${overdue.length} overdue and ${tomorrowTasks.length} tasks due tomorrow`,
            greeting: `🌆 Good Evening, ${user.name || "there"}!`,
            intro: introLines,
            button: { text: "View All Tasks", url: taskUrl },
            outro: ["Have a restful evening!"],
            supportEmail: "support@myenum.in",
          })
        );

        notified++;
      }
    }

    logger.info({ notified, totalUsers, totalOverdue, totalTomorrow }, "Evening reminders sent");

    res.json({
      success: true,
      data: { notified, users: totalUsers, overdue: totalOverdue, dueTomorrow: totalTomorrow },
    });
  } catch (err: any) {
    logger.error({ err }, "Evening reminder processing failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
