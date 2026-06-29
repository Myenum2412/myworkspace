import { Router } from "express";
import { Notification } from "../lib/db/models/Notification.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { socketIOManager } from "../lib/socketio/index.js";
const router = Router();
router.use(authenticate);
router.post("/", async (req, res) => {
    const { userId, orgId, type, title, message, link } = req.body;
    if (!userId || !type || !title) {
        throw new AppError(400, "userId, type, and title are required");
    }
    const targetOrgId = orgId || req.user.orgId || "";
    const doc = await Notification.create({
        userId,
        orgId: targetOrgId,
        createdBy: req.user.userId,
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
    res.status(201).json({ success: true, data: payload });
});
router.get("/", async (req, res) => {
    const userId = req.user.userId;
    const docs = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    const notifications = docs.map((d) => ({
        ...d,
        id: d._id?.toString() || d.id,
    }));
    res.json({ success: true, data: notifications });
});
router.get("/unread-count", async (req, res) => {
    const count = await Notification.countDocuments({
        userId: req.user.userId,
        read: false,
    });
    res.json({ success: true, data: { count } });
});
router.post("/read-all", async (req, res) => {
    const userId = req.user.userId;
    await Notification.updateMany({ userId }, { read: true });
    res.json({ success: true });
});
router.post("/:id/read", async (req, res) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
        throw new AppError(404, "Notification not found");
    if (notification.userId.toString() !== req.user.userId)
        throw new AppError(403, "Not authorized");
    notification.read = true;
    await notification.save();
    res.json({ success: true });
});
export default router;
