import type { Agenda } from "agenda";
import { logger } from "../lib/logger/index.js";
import { processHourlyDigests, processDailyDigests, processWeeklyDigests, processUnreadReminders } from "./notification-digest.service.js";
import { Notification } from "../lib/db/models/Notification.js";

export function registerNotificationJobs(agenda: Agenda): void {
  agenda.define("notification:process-hourly-digests", async (_job: any) => {
    await processHourlyDigests();
  });

  agenda.define("notification:process-daily-digests", async (_job: any) => {
    await processDailyDigests();
  });

  agenda.define("notification:process-weekly-digests", async (_job: any) => {
    await processWeeklyDigests();
  });

  agenda.define("notification:process-unread-reminders", async (_job: any) => {
    await processUnreadReminders();
  });

  agenda.define("notification:cleanup-expired", async (_job: any) => {
    const result = await Notification.deleteMany({
      expiresAt: { $lte: new Date() },
    });
    if (result.deletedCount > 0) {
      logger.info({ deletedCount: result.deletedCount }, "Cleaned up expired notifications");
    }
  });

  agenda.define("notification:process-snoozed", async (_job: any) => {
    const snoozed = await Notification.find({
      snoozedUntil: { $lte: new Date(), $ne: null },
      archived: { $ne: true },
    }).lean();

    for (const n of snoozed) {
      try {
        await Notification.updateOne(
          { _id: n._id },
          { $unset: { snoozedUntil: "" } }
        );
        logger.debug({ notificationId: n._id }, "Snoozed notification reactivated");
      } catch (err) {
        logger.error({ err, notificationId: n._id }, "Failed to reactivate snoozed notification");
      }
    }
  });

  logger.info("Notification jobs registered with Agenda");
}

export function scheduleNotificationJobs(agenda: Agenda): void {
  agenda.every("30 minutes", "notification:process-hourly-digests");
  agenda.every("0 8 * * *", "notification:process-daily-digests");
  agenda.every("0 9 * * 1", "notification:process-weekly-digests");
  agenda.every("0 10,14,18 * * *", "notification:process-unread-reminders");
  agenda.every("0 3 * * *", "notification:cleanup-expired");
  agenda.every("5 minutes", "notification:process-snoozed");

  logger.info("Notification scheduled jobs registered");
}
