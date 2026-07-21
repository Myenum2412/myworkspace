import { domainEvents, DomainEventType } from "./index.js";
import { createNotification } from "../../services/notification.service.js";
import { queueNotificationEmail } from "../../services/email-queue.service.js";
import { logger } from "../logger/index.js";
import { recordAuditLog } from "../../services/audit.service.js";

export function registerNotificationEventHandlers(): void {
  domainEvents.on("notification:sent", async (payload) => {
    try {
      await recordAuditLog({
        orgId: payload.orgId,
        userId: payload.userId,
        action: "notification.sent",
        entityType: "notification",
        description: `Notification sent: ${payload.type} - ${payload.title}`,
        ipAddress: "system",
        userAgent: "system",
        success: true,
        metadata: {
          type: payload.type,
          title: payload.title,
          message: payload.message,
        },
        tags: ["notification"],
      });
    } catch (err) {
      logger.error({ err }, "Failed to audit notification:sent event");
    }
  });

  logger.info("Notification event handlers registered");
}

export function emitNotificationEvent(
  userId: string,
  orgId: string,
  type: string,
  title: string,
  message: string,
): void {
  try {
    domainEvents.emit("notification:sent", { userId, orgId, type, title, message });
  } catch (err) {
    logger.error({ err }, "Failed to emit notification:sent event");
  }
}
