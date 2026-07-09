import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { createNotification, listNotifications, getUnreadCount, markAllRead, markRead, archiveNotification, deleteNotification, clearAll, } from "../services/notification.service.js";
import { configureVapid, getVapidPublicKey, subscribeUser, unsubscribeUser } from "../services/push.service.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
const router = Router();
router.use(authenticate);
// VAPID public key (no auth required, but needs optional)
router.get("/vapid-public-key", optionalAuth, (_req, res) => {
    configureVapid();
    const key = getVapidPublicKey();
    res.json({ success: true, data: { publicKey: key } });
});
// Create notification
router.post("/", async (req, res) => {
    const { type, title, message, link, category, priority, icon, actions, metadata } = req.body;
    if (!type || !title) {
        throw new AppError(400, "type and title are required");
    }
    const userId = req.user.userId;
    const targetOrgId = req.body.orgId || req.user.orgId;
    if (!targetOrgId) {
        throw new AppError(400, "orgId is required");
    }
    const payload = await createNotification({
        userId,
        orgId: targetOrgId,
        createdBy: userId,
        type,
        category,
        priority,
        title,
        message,
        icon,
        link,
        actions,
        metadata,
    });
    res.status(201).json({ success: true, data: payload });
});
// List notifications (paginated)
router.get("/", async (req, res) => {
    const { limit, offset, unreadOnly, category } = req.query;
    const result = await listNotifications(req.user.userId, {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
        unreadOnly: unreadOnly === "true",
        category: category,
    });
    res.json({ success: true, ...result });
});
// Unread count
router.get("/unread-count", cacheEnhanced({ ttl: 15, varyByUser: true, tags: ["notifications"] }), async (req, res) => {
    const count = await getUnreadCount(req.user.userId);
    res.json({ success: true, data: { count } });
});
// Mark all as read
router.post("/read-all", async (req, res) => {
    await markAllRead(req.user.userId);
    res.json({ success: true });
});
// Mark single notification as read
router.post("/:id/read", async (req, res) => {
    const payload = await markRead(req.params.id, req.user.userId);
    res.json({ success: true, data: payload });
});
// Archive notification
router.post("/:id/archive", async (req, res) => {
    await archiveNotification(req.params.id, req.user.userId);
    res.json({ success: true });
});
// Delete notification
router.delete("/:id", async (req, res) => {
    await deleteNotification(req.params.id, req.user.userId);
    res.json({ success: true });
});
// Clear all notifications
router.post("/clear-all", async (req, res) => {
    await clearAll(req.user.userId);
    res.json({ success: true });
});
// ─── Push subscription ───
// Subscribe to push notifications
router.post("/push/subscribe", async (req, res) => {
    configureVapid();
    const { endpoint, keys, userAgent } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
        throw new AppError(400, "endpoint and keys are required");
    }
    await subscribeUser(req.user.userId, req.user.orgId || "", { endpoint, keys }, userAgent);
    res.json({ success: true });
});
// Unsubscribe from push notifications
router.post("/push/unsubscribe", async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint)
        throw new AppError(400, "endpoint is required");
    await unsubscribeUser(req.user.userId, endpoint);
    res.json({ success: true });
});
// ─── Notification settings ───
// Get notification settings
router.get("/settings", async (req, res) => {
    const userId = req.user.userId;
    let settings = await NotificationSettings.findOne({ userId });
    if (!settings) {
        settings = await NotificationSettings.create({
            userId,
            orgId: req.user.orgId,
            settings: [],
            desktopEnabled: true,
            soundEnabled: true,
        });
    }
    res.json({ success: true, data: settings });
});
// Update notification settings
router.put("/settings", async (req, res) => {
    const userId = req.user.userId;
    const { settings, quietHoursEnabled, quietHoursStart, quietHoursEnd, desktopEnabled, soundEnabled } = req.body;
    const updated = await NotificationSettings.findOneAndUpdate({ userId }, {
        $set: {
            ...(settings !== undefined && { settings }),
            ...(quietHoursEnabled !== undefined && { quietHoursEnabled }),
            ...(quietHoursStart !== undefined && { quietHoursStart }),
            ...(quietHoursEnd !== undefined && { quietHoursEnd }),
            ...(desktopEnabled !== undefined && { desktopEnabled }),
            ...(soundEnabled !== undefined && { soundEnabled }),
            updatedAt: new Date(),
        },
    }, { upsert: true, new: true });
    res.json({ success: true, data: updated });
});
export default router;
