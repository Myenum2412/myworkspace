import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { createNotification, listNotifications, getUnreadCount, markAllRead, markRead, } from "../services/notification.service.js";
const router = Router();
router.use(authenticate);
router.post("/", async (req, res) => {
    const { type, title, message, link } = req.body;
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
        title,
        message,
        link,
    });
    res.status(201).json({ success: true, data: payload });
});
router.get("/", cacheEnhanced({ ttl: 15, varyByUser: true, tags: ["notifications"] }), async (req, res) => {
    const notifications = await listNotifications(req.user.userId);
    res.json({ success: true, data: notifications });
});
router.get("/unread-count", cacheEnhanced({ ttl: 15, varyByUser: true, tags: ["notifications"] }), async (req, res) => {
    const count = await getUnreadCount(req.user.userId);
    res.json({ success: true, data: { count } });
});
router.post("/read-all", async (req, res) => {
    await markAllRead(req.user.userId);
    res.json({ success: true });
});
router.post("/:id/read", async (req, res) => {
    await markRead(req.params.id, req.user.userId);
    res.json({ success: true });
});
export default router;
