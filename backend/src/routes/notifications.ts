// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { EmailLog } from "../lib/db/models/EmailLog.js";
import { Notification } from "../lib/db/models/Notification.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { logger } from "../lib/logger/index.js";
import { broadcastNotification } from "../lib/notifications/notify-broadcast.js";
import { type AuthRequest, authenticate, optionalAuth } from "../middleware/auth.js";
import { orgAdminOnly } from "../middleware/authorize.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { AppError } from "../middleware/error.js";
import {
  archiveNotification,
  bulkArchive,
  bulkDelete,
  clearAll,
  createNotification,
  deleteNotification,
  getNotificationAnalytics,
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
  searchNotifications,
  snoozeNotification,
} from "../services/notification.service.js";
import { getUserTopic } from "../services/ntfy.service.js";
import {
  configureVapid,
  getPushConfig,
  subscribeUser,
  unsubscribeUser,
} from "../services/push.service.js";

export default async function plugin(fastify: FastifyInstance) {
// Push configuration (ntfy)
fastify.get("/push/config", optionalAuth, (_req: AuthRequest, reply: any) => {
  configureVapid();
  const config = getPushConfig();
  reply.send({ success: true, data: config });
});

// Per-user ntfy topic (used by the frontend to build subscribe links)
fastify.get("/push/topic", (req: AuthRequest, reply: any) => {
  configureVapid();
  const config = getPushConfig();
  const topic = getUserTopic(req.user!.userId);
  reply.send({
    success: true,
    data: {
      enabled: config.enabled,
      baseUrl: config.baseUrl,
      topic,
      subscribeUrl: config.enabled ? `${config.baseUrl}/${topic}` : "",
    },
  });
});

// Create notification (for system/API use)
fastify.get("/", async (req: AuthRequest, reply: any) => {
  const {
    type,
    title,
    message,
    link,
    deepLink,
    category,
    priority,
    icon,
    avatar,
    actions,
    metadata,
    userId,
    channels,
    correlationId,
    expiresAt,
  } = req.body;
  if (!type || !title) {
    throw new AppError(400, "type and title are required");
  }
  const targetUserId = userId || req.user!.userId;
  const targetOrgId = req.body.orgId || req.user!.orgId;
  if (!targetOrgId) {
    throw new AppError(400, "orgId is required");
  }

  const payload = await createNotification({
    userId: targetUserId,
    orgId: targetOrgId,
    createdBy: req.user!.userId,
    type,
    category,
    priority,
    title,
    message,
    icon,
    avatar,
    link,
    deepLink,
    actions,
    metadata,
    channels,
    correlationId,
    expiresAt,
  });

  if (payload) {
    reply.send(201).json({ success: true, data: payload });
  } else {
    reply.send({ success: true, data: null, note: "notification_suppressed" });
  }
});

// List notifications with advanced filtering
fastify.get("/", async (req: AuthRequest, reply: any) => {
  const {
    limit,
    offset,
    unreadOnly,
    category,
    type,
    priority,
    search,
    startDate,
    endDate,
    archived,
  } = req.query;
  const result = await listNotifications(req.user!.userId, {
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
    unreadOnly: unreadOnly === "true",
    category: category as string | undefined,
    type: type as string | undefined,
    priority: priority as string | undefined,
    search: search as string | undefined,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    archived: archived === "true",
  });
  reply.send({ success: true, ...result });
});

// Search notifications
fastify.get("/search", async (req: AuthRequest, reply: any) => {
  const { q, limit, offset } = req.query;
  if (!q) throw new AppError(400, "Search query (q) is required");
  const result = await searchNotifications(req.user!.userId, q as string, {
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });
  reply.send({ success: true, ...result });
});

// Unread count
fastify.get(
  "/unread-count",
  cacheEnhanced({ ttl: 15, varyByUser: true, tags: ["notifications"] }),
  async (req: AuthRequest, reply: any) => {
    const count = await getUnreadCount(req.user!.userId);
    reply.send({ success: true, data: { count } });
  },
);

// Mark all as read
fastify.get("/read-all", async (req: AuthRequest, reply: any) => {
  await markAllRead(req.user!.userId);
  reply.send({ success: true });
});

// Mark single notification as read
fastify.get("/:id/read", async (req: AuthRequest, reply: any) => {
  const payload = await markRead(req.params.id, req.user!.userId);
  reply.send({ success: true, data: payload });
});

// Archive notification
fastify.get("/:id/archive", async (req: AuthRequest, reply: any) => {
  await archiveNotification(req.params.id, req.user!.userId);
  reply.send({ success: true });
});

// Delete notification
fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  await deleteNotification(req.params.id, req.user!.userId);
  reply.send({ success: true });
});

// Clear all notifications
fastify.get("/clear-all", async (req: AuthRequest, reply: any) => {
  await clearAll(req.user!.userId);
  reply.send({ success: true });
});

// Bulk archive
fastify.get("/bulk-archive", async (req: AuthRequest, reply: any) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError(400, "ids array is required");
  }
  await bulkArchive(req.user!.userId, ids);
  reply.send({ success: true });
});

// Bulk delete
fastify.get("/bulk-delete", async (req: AuthRequest, reply: any) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError(400, "ids array is required");
  }
  await bulkDelete(req.user!.userId, ids);
  reply.send({ success: true });
});

// Snooze notification
fastify.get("/:id/snooze", async (req: AuthRequest, reply: any) => {
  const { until } = req.body;
  if (!until) throw new AppError(400, "until (ISO date) is required");
  await snoozeNotification(req.params.id, req.user!.userId, new Date(until));
  reply.send({ success: true });
});

// ─── Push subscription (ntfy) ───

// Legacy web-push subscription endpoint. Kept for compatibility — the active
// push channel is ntfy, which is configured via /push/topic on the frontend.
fastify.get("/push/subscribe", async (req: AuthRequest, reply: any) => {
  configureVapid();
  const { endpoint, keys, userAgent } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new AppError(400, "endpoint and keys are required");
  }
  await subscribeUser(req.user!.userId, req.user!.orgId || "", { endpoint, keys }, userAgent);
  reply.send({ success: true });
});

fastify.get("/push/unsubscribe", async (req: AuthRequest, reply: any) => {
  const { endpoint } = req.body;
  if (!endpoint) throw new AppError(400, "endpoint is required");
  await unsubscribeUser(req.user!.userId, endpoint);
  reply.send({ success: true });
});

// ─── Notification settings ───

fastify.get("/settings", async (req: AuthRequest, reply: any) => {
  const userId = req.user!.userId;
  let settings = (await NotificationSettings.findOne({ userId }).lean()) as any;
  if (!settings) {
    settings = (
      await NotificationSettings.create({
        userId,
        orgId: req.user!.orgId,
        typeSettings: [],
        desktopEnabled: true,
        soundEnabled: true,
        frequency: "instant",
        language: "en",
      })
    ).toObject();
  }
  reply.send({ success: true, data: settings });
});

fastify.get("/settings", async (req: AuthRequest, reply: any) => {
  const userId = req.user!.userId;
  const {
    settings,
    typeSettings,
    categorySettings,
    frequency,
    quietHoursEnabled,
    quietHoursStart,
    quietHoursEnd,
    quietHoursTimezone,
    doNotDisturb,
    dndUntil,
    snoozeSchedules,
    mutedNotifications,
    desktopEnabled,
    soundEnabled,
    emailDigestTime,
    emailDigestTimezone,
    language,
  } = req.body;
  const updated = await NotificationSettings.findOneAndUpdate(
    { userId },
    {
      $set: {
        ...(typeSettings !== undefined && { typeSettings }),
        ...(categorySettings !== undefined && { categorySettings }),
        ...(frequency !== undefined && { frequency }),
        ...(quietHoursEnabled !== undefined && { quietHoursEnabled }),
        ...(quietHoursStart !== undefined && { quietHoursStart }),
        ...(quietHoursEnd !== undefined && { quietHoursEnd }),
        ...(quietHoursTimezone !== undefined && { quietHoursTimezone }),
        ...(doNotDisturb !== undefined && { doNotDisturb }),
        ...(dndUntil !== undefined && { dndUntil }),
        ...(snoozeSchedules !== undefined && { snoozeSchedules }),
        ...(mutedNotifications !== undefined && { mutedNotifications }),
        ...(desktopEnabled !== undefined && { desktopEnabled }),
        ...(soundEnabled !== undefined && { soundEnabled }),
        ...(emailDigestTime !== undefined && { emailDigestTime }),
        ...(emailDigestTimezone !== undefined && { emailDigestTimezone }),
        ...(language !== undefined && { language }),
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );
  reply.send({ success: true, data: updated });
});

// ─── Broadcast (admin only) ───

fastify.get("/broadcast", orgAdminOnly(), async (req: AuthRequest, reply: any) => {
  const { title, message, type, category, priority, link, userIds, roles } = req.body;
  if (!title || !message) {
    throw new AppError(400, "title and message are required");
  }
  await broadcastNotification(req.user!.orgId!, req.user!.userId!, title, message, {
    type,
    category,
    priority,
    link,
    userIds,
    roles,
  });
  reply.send({ success: true });
});

// ─── Analytics (admin only) ───

fastify.get("/analytics", orgAdminOnly(), async (req: AuthRequest, reply: any) => {
  const { startDate, endDate } = req.query;
  const analytics = await getNotificationAnalytics(req.user!.orgId!, {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  reply.send({ success: true, data: analytics });
});

// ─── Email log (admin only) ───

fastify.get("/email-logs", orgAdminOnly(), async (req: AuthRequest, reply: any) => {
  const { limit, offset, status, startDate, endDate } = req.query;
  const filter: Record<string, any> = { orgId: req.user!.orgId! };
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }
  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit ? parseInt(limit as string, 10) : 50)
      .skip(offset ? parseInt(offset as string, 10) : 0)
      .lean(),
    EmailLog.countDocuments(filter),
  ]);
  reply.send({ success: true, data: { logs, total } });
});
}
