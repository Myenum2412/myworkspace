import { Notification } from "../lib/db/models/Notification.js";
import { AppError } from "../middleware/error.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { cacheManager } from "../lib/cache.js";

export async function createNotification(data: {
  userId: string;
  orgId: string;
  createdBy: string;
  type: string;
  title: string;
  message?: string;
  link?: string;
}): Promise<any> {
  const { userId, orgId, createdBy, type, title, message, link } = data;
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
    title,
    message,
    link,
    read: false,
    createdAt: new Date(),
  });

  const payload = {
    id: doc._id.toString(),
    userId: doc.userId,
    type: doc.type,
    title: doc.title,
    message: doc.message,
    read: doc.read,
    link: doc.link,
    createdAt: doc.createdAt,
  };

  socketIOManager.emitToUser(doc.userId, "notification", payload);
  cacheManager.invalidatePattern(`notifications:${doc.userId}`);

  return payload;
}

export async function listNotifications(userId: string): Promise<any[]> {
  const docs = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return docs.map((d: any) => ({
    ...d,
    id: d._id?.toString() || d.id,
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return Notification.countDocuments({
    userId,
    read: false,
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await Notification.updateMany({ userId }, { read: true });
  cacheManager.invalidatePattern(`notifications:${userId}`);
}

export async function markRead(notificationId: string, userId: string): Promise<void> {
  const notification = await Notification.findById(notificationId);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== userId) throw new AppError(403, "Not authorized");
  notification.read = true;
  await notification.save();
  cacheManager.invalidatePattern(`notifications:${userId}`);
}
