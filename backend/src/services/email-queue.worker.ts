import { registerHandler } from "../lib/queue/consumer.js";
import { logger } from "../lib/logger/index.js";
import { queueNotificationEmail } from "./email-queue.service.js";

export function registerEmailQueueWorker(): void {
  registerHandler("notification.email.send", async (_msg, data) => {
    const payload = data as Record<string, any>;
    try {
      await queueNotificationEmail(
        payload.notificationId,
        payload.userId,
        payload.orgId,
        payload.type,
        payload.title,
        payload.message,
        payload.link,
        payload.category,
        payload.correlationId,
      );
      return { success: true };
    } catch (err: any) {
      logger.error({ err, notificationId: payload.notificationId }, "Email queue worker failed");
      return { success: false, error: err.message };
    }
  });

  logger.info("Email queue worker registered");
}
