import { Router } from "express";
import { Notification } from "../lib/db/models/Notification";
import { authenticate } from "../middleware/auth";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
    const userId = req.query.userId || req.user.userId;
    const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
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
    const userId = req.body.userId || req.user.userId;
    await Notification.updateMany({ userId }, { read: true });
    res.json({ success: true });
});
router.post("/:id/read", async (req, res) => {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ success: true });
});
export default router;
