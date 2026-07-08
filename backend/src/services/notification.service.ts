import { Notification, NotificationType, NotificationCategory, NotificationPriority, INotificationAction } from "../lib/db/models/Notification.js";
import { AppError } from "../middleware/error.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { cacheManager } from "../lib/cache.js";
import { sendPushNotification } from "./push.service.js";
import { logger } from "../lib/logger/index.js";

export interface CreateNotificationParams {
  userId: string;
  orgId: string;
  createdBy: string;
  type: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  title: string;
  message?: string;
  icon?: string;
  link?: string;
  actions?: INotificationAction[];
  metadata?: Record<string, unknown>;
}

export async function createNotification(data: CreateNotificationParams): Promise<any> {
  const { userId, orgId, createdBy, type, category, priority, title, message, icon, link, actions, metadata } = data;
  if (!userId || !type || !title) {
    throw new AppError(400, "userId, type, and title are required");
  }
  if (!orgId) {
    throw new AppError(400, "orgId is required");
  }

  const doc = await Notification.create({
    userId,
    orgId,
    createdBy,
    type,
    category: category || "system",
    priority: priority || "normal",
    title,
    message,
    icon,
    link,
    actions: actions || [],
    metadata: metadata ? JSON.stringify(metadata) : undefined,
    read: false,
    createdAt: new Date(),
  });

  const payload = serializeNotification(doc);

  // Real-time delivery via Socket.IO
  socketIOManager.emitToUser(doc.userId, "notification", payload);
  cacheManager.invalidatePattern(`notifications:${doc.userId}`);

  // Web push delivery
  sendPushNotification(userId, {
    title,
    message,
    icon: icon || "/web-app-manifest-192x192.png",
    link,
    actions: actions?.map((a) => ({
      action: a.action,
      title: a.label,
      url: a.url || link,
    })),
    tag: `notification:${doc._id}`,
  }).catch((err) => {
    logger.error({ err: err.message, userId }, "Push notification failed");
  });

  return payload;
}

export async function listNotifications(
  userId: string,
  options?: { limit?: number; offset?: number; unreadOnly?: boolean; category?: string }
): Promise<{ notifications: any[]; total: number; unread: number }> {
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const filter: Record<string, any> = { userId, archived: { $ne: true } };
  if (options?.unreadOnly) filter.read = false;
  if (options?.category) filter.category = options.category;

  const [docs, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, read: false, archived: { $ne: true } }),
  ]);

  return {
    notifications: docs.map((d: any) => serializeNotification(d)),
    total,
    unread,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({ userId, read: false, archived: { $ne: true } });
}

export async function markAllRead(userId: string): Promise<void> {
  await Notification.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function markRead(notificationId: string, userId: string): Promise<any> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  notification.read = true;
  notification.readAt = new Date();
  await notification.save();
  cacheManager.invalidatePattern(`notifications:${userId}`);
  return serializeNotification(notification);
}

export async function archiveNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  notification.archived = true;
  await notification.save();
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  await Notification.findByIdAndDelete(notificationId);
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function clearAll(userId: string): Promise<void> {
  await Notification.updateMany({ userId }, { archived: true });
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

function serializeNotification(doc: any) {
  return {
    id: doc._id?.toString() || doc.id,
    userId: doc.userId,
    orgId: doc.orgId,
    type: doc.type,
    category: doc.category,
    priority: doc.priority,
    title: doc.title,
    message: doc.message,
    icon: doc.icon,
    read: doc.read,
    readAt: doc.readAt,
    archived: doc.archived,
    link: doc.link,
    actions: doc.actions || [],
    createdAt: doc.createdAt,
  };
}
