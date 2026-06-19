import { Router, Response } from "express";
import { Notification } from "../lib/db/models/Notification.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const notifications = await Notification.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ success: true, data: notifications });
});

router.get("/unread-count", async (req: AuthRequest, res: Response) => {
  const count = await Notification.countDocuments({
    userId: req.user!.userId,
    read: false,
  });
  res.json({ success: true, data: { count } });
});

router.post("/read-all", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  await Notification.updateMany({ userId }, { read: true });
  res.json({ success: true });
});

router.post("/:id/read", async (req: AuthRequest, res: Response) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification) throw new AppError(404, "Notification not found");
  if (notification.userId.toString() !== req.user!.userId) throw new AppError(403, "Not authorized");
  notification.read = true;
  await notification.save();
  res.json({ success: true });
});

export default router;
