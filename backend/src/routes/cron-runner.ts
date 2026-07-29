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

export default router;
