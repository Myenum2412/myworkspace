import { type Request, type Response, Router } from "express";
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
          message: tasks
            .map(
              (t: any) =>
                `• ${t.title}${t.dueDate ? ` (by ${new Date(t.dueDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })})` : ""}`,
            )
            .join("\n"),
          priority: "medium",
          correlationId: `morning-reminder-${uid}-${todayStart.getTime()}`,
        });

        const { sendEmail } = await import("../lib/mail/sender.js");
        const { buildEmailHtml } = await import("../lib/mail/templates/builder.js");
        const taskList = tasks
          .map(
            (t: any) =>
              `• ${t.title}${t.dueDate ? ` — Due: ${new Date(t.dueDate).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` : ""}`,
          )
          .join("<br>");

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
          }),
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

        const notificationParts: string[] = [];
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

        const introLines: string[] = [];
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
          }),
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

router.get("/generate-repeated-tasks", async (_req: Request, res: Response) => {
  try {
    const { Task } = await import("../lib/db/models/Task.js");

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    // Find all tasks with repeatType that need a new instance generated
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

      // Skip if repeatStartDate is in the future
      if (repeatStart && repeatStart > now) {
        skipped++;
        continue;
      }

      // Determine if we should generate today
      const lastGenerated = template.lastRepeatGeneratedAt
        ? new Date(template.lastRepeatGeneratedAt)
        : null;

      let shouldGenerate = false;

      if (template.repeatType === "daily") {
        // Generate once per day
        const todayStr = todayStart.toISOString().slice(0, 10);
        const lastGenStr = lastGenerated ? lastGenerated.toISOString().slice(0, 10) : null;
        shouldGenerate = lastGenStr !== todayStr;
      } else if (template.repeatType === "weekly") {
        // Generate once per week (the week starts on repeatStartDate)
        if (repeatStart) {
          const daysSinceStart = Math.floor(
            (now.getTime() - repeatStart.getTime()) / (1000 * 60 * 60 * 24),
          );
          const currentWeekIndex = Math.floor(daysSinceStart / 7);
          const weekStart = new Date(
            repeatStart.getTime() + currentWeekIndex * 7 * 24 * 60 * 60 * 1000,
          );

          if (lastGenerated) {
            const lastGenWeekIndex = Math.floor(
              (lastGenerated.getTime() - repeatStart.getTime()) / (1000 * 60 * 60 * 24) / 7,
            );
            shouldGenerate = lastGenWeekIndex < currentWeekIndex;
          } else {
            shouldGenerate = true;
          }

          // Also skip if we're before repeatStartDate
          if (now < repeatStart) shouldGenerate = false;
        }
      }

      if (!shouldGenerate) {
        skipped++;
        continue;
      }

      // Create a new task instance
      const newTask = {
        orgId: template.orgId,
        type: template.type,
        teamId: template.teamId,
        assigneeId: template.assigneeId,
        creatorId: template.creatorId,
        createdBy: template.createdBy,
        title: template.title,
        description: template.description,
        project: template.project,
        status: "assigned" as const,
        priority: template.priority || "medium",
        selectedUserIds: template.selectedUserIds,
        isSaved: false,
        isActive: true,
      };

      await Task.create(newTask);

      // Update lastRepeatGeneratedAt on the template
      await Task.updateOne({ _id: template._id }, { $set: { lastRepeatGeneratedAt: now } });

      created++;
    }

    logger.info(
      { created, skipped, total: repeatTemplates.length },
      "Repeated task instances generated",
    );

    res.json({
      success: true,
      data: { created, skipped, total: repeatTemplates.length },
    });
  } catch (err: any) {
    logger.error({ err }, "Repeated task generation failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
