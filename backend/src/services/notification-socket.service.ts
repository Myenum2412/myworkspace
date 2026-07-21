import { socketIOManager } from "../lib/socketio/index.js";
import { logger } from "../lib/logger/index.js";

export interface SocketNotificationEvent {
  type: string;
  userId?: string;
  orgId?: string;
  payload: any;
}

export function emitSocketNotification(event: SocketNotificationEvent): void {
  try {
    if (event.userId) {
      socketIOManager.emitToUser(event.userId, event.type, event.payload);
    }
    if (event.orgId) {
      socketIOManager.emitToOrg(event.orgId, event.type, event.payload);
    }
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Socket notification emit failed");
  }
}

export function emitNotificationDelivered(userId: string, payload: any): void {
  emitSocketNotification({ type: "notification", userId, payload });
}

export function emitBroadcast(orgId: string, payload: any): void {
  emitSocketNotification({ type: "broadcast", orgId, payload });
}

export function emitUnreadCountUpdate(userId: string, count: number): void {
  emitSocketNotification({ type: "unread_count", userId, payload: { count } });
}
