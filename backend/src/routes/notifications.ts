import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { orgAdminOnly } from "../middleware/authorize.js";
import {
  createNotification,
  listNotifications,
  searchNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  archiveNotification,
  deleteNotification,
  clearAll,
  bulkArchive,
  bulkDelete,
  snoozeNotification,
  getNotificationAnalytics,
} from "../services/notification.service.js";
import { configureVapid, getVapidPublicKey, subscribeUser, unsubscribeUser } from "../services/push.service.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { Notification } from "../lib/db/models/Notification.js";
import { EmailLog } from "../lib/db/models/EmailLog.js";
import { broadcastNotification } from "../lib/notifications/notify-broadcast.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

router.use(authenticate);

// VAPID public key
router.get("/vapid-public-key", optionalAuth, (_req: AuthRequest, res: Response) => {
  configureVapid();
  const key = getVapidPublicKey();
  res.json({ success: true, data: { publicKey: key } });
});

// Create notification (for system/API use)
router.post("/", async (req: AuthRequest, res: Response) => {
  const { type, title, message, link, deepLink, category, priority, icon, avatar, actions, metadata, userId, channels, correlationId, expiresAt } = req.body;
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
    res.status(201).json({ success: true, data: payload });
  } else {
    res.json({ success: true, data: null, note: "notification_suppressed" });
  }
});

// List notifications with advanced filtering
router.get("/", async (req: AuthRequest, res: Response) => {
  const { limit, offset, unreadOnly, category, type, priority, search, startDate, endDate, archived } = req.query;
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
  res.json({ success: true, ...result });
});

// Search notifications
router.get("/search", async (req: AuthRequest, res: Response) => {
  const { q, limit, offset } = req.query;
  if (!q) throw new AppError(400, "Search query (q) is required");
  const result = await searchNotifications(req.user!.userId, q as string, {
    limit: limit ? parseInt(limit as string, 10) : 50,
    offset: offset ? parseInt(offset as string, 10) : 0,
  });
  res.json({ success: true, ...result });
});

// Unread count
router.get("/unread-count", cacheEnhanced({ ttl: 15, varyByUser: true, tags: ["notifications"] }), async (req: AuthRequest, res: Response) => {
  const count = await getUnreadCount(req.user!.userId);
  res.json({ success: true, data: { count } });
});

// Mark all as read
router.post("/read-all", async (req: AuthRequest, res: Response) => {
  await markAllRead(req.user!.userId);
  res.json({ success: true });
});

// Mark single notification as read
router.post("/:id/read", async (req: AuthRequest, res: Response) => {
  const payload = await markRead(req.params.id, req.user!.userId);
  res.json({ success: true, data: payload });
});

// Archive notification
router.post("/:id/archive", async (req: AuthRequest, res: Response) => {
  await archiveNotification(req.params.id, req.user!.userId);
  res.json({ success: true });
});

// Delete notification
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  await deleteNotification(req.params.id, req.user!.userId);
  res.json({ success: true });
});

// Clear all notifications
router.post("/clear-all", async (req: AuthRequest, res: Response) => {
  await clearAll(req.user!.userId);
  res.json({ success: true });
});

// Bulk archive
router.post("/bulk-archive", async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError(400, "ids array is required");
  }
  await bulkArchive(req.user!.userId, ids);
  res.json({ success: true });
});

// Bulk delete
router.post("/bulk-delete", async (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    throw new AppError(400, "ids array is required");
  }
  await bulkDelete(req.user!.userId, ids);
  res.json({ success: true });
});

// Snooze notification
router.post("/:id/snooze", async (req: AuthRequest, res: Response) => {
  const { until } = req.body;
  if (!until) throw new AppError(400, "until (ISO date) is required");
  await snoozeNotification(req.params.id, req.user!.userId, new Date(until));
  res.json({ success: true });
});

// ─── Push subscription ───

router.post("/push/subscribe", async (req: AuthRequest, res: Response) => {
  configureVapid();
  const { endpoint, keys, userAgent } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new AppError(400, "endpoint and keys are required");
  }
  await subscribeUser(req.user!.userId, req.user!.orgId || "", { endpoint, keys }, userAgent);
  res.json({ success: true });
});

router.post("/push/unsubscribe", async (req: AuthRequest, res: Response) => {
  const { endpoint } = req.body;
  if (!endpoint) throw new AppError(400, "endpoint is required");
  await unsubscribeUser(req.user!.userId, endpoint);
  res.json({ success: true });
});

// ─── Notification settings ───

router.get("/settings", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  let settings = await NotificationSettings.findOne({ userId }).lean() as any;
  if (!settings) {
    settings = (await NotificationSettings.create({
      userId,
      orgId: req.user!.orgId,
      typeSettings: [],
      desktopEnabled: true,
      soundEnabled: true,
      frequency: "instant",
      language: "en",
    })).toObject();
  }
  res.json({ success: true, data: settings });
});

router.put("/settings", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { settings, typeSettings, categorySettings, frequency, quietHoursEnabled, quietHoursStart, quietHoursEnd, quietHoursTimezone, doNotDisturb, dndUntil, snoozeSchedules, mutedNotifications, desktopEnabled, soundEnabled, emailDigestTime, emailDigestTimezone, language } = req.body;
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
    { upsert: true, new: true }
  );
  res.json({ success: true, data: updated });
});

// ─── Broadcast (admin only) ───

router.post("/broadcast", orgAdminOnly(), async (req: AuthRequest, res: Response) => {
  const { title, message, type, category, priority, link, userIds, roles } = req.body;
  if (!title || !message) {
    throw new AppError(400, "title and message are required");
  }
  await broadcastNotification(req.user!.orgId!, req.user!.userId!, title, message, {
    type, category, priority, link, userIds, roles,
  });
  res.json({ success: true });
});

// ─── Analytics (admin only) ───

router.get("/analytics", orgAdminOnly(), async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = req.query;
  const analytics = await getNotificationAnalytics(req.user!.orgId!, {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
  });
  res.json({ success: true, data: analytics });
});

// ─── Email log (admin only) ───

router.get("/email-logs", orgAdminOnly(), async (req: AuthRequest, res: Response) => {
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
  res.json({ success: true, data: { logs, total } });
});

export default router;
