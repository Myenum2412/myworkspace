import { createNotification } from "../../services/notification.service.js";
import { socketIOManager } from "../socketio/index.js";
import { logger } from "../logger/index.js";

export async function broadcastNotification(
  orgId: string,
  senderId: string,
  title: string,
  message: string,
  options?: {
    type?: string;
    category?: any;
    priority?: any;
    link?: string;
    actions?: any[];
    metadata?: Record<string, unknown>;
    userIds?: string[];
    roles?: string[];
  }
): Promise<void> {
  const type = (options?.type as any) || "broadcast_message";
  const category = (options?.category as any) || "system";
  const priority = (options?.priority as any) || "high";

  if (options?.userIds && options.userIds.length > 0) {
    for (const userId of options.userIds) {
      try {
        await createNotification({
          userId,
          orgId,
          createdBy: senderId,
          type,
          category,
          priority,
          title,
          message,
          link: options?.link,
          actions: options?.actions,
          metadata: options?.metadata,
        });
      } catch (err) {
        logger.error({ err, userId }, "Broadcast notification failed");
      }
    }
  }

  // Broadcast via Socket.IO to the entire org
  try {
    socketIOManager.emitToOrg(orgId, "broadcast", {
      type,
      title,
      message,
      link: options?.link,
      priority,
      senderId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Socket.IO broadcast failed");
  }
}
