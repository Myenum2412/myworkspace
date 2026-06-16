import { Router, Response } from "express";
import { User } from "../lib/db/models/User";
import { AuthRequest, authenticate } from "../middleware/auth";
import { AppError } from "../middleware/error";

const router = Router();

router.use(authenticate);

router.get("/status", async (req: AuthRequest, res: Response) => {
  const userId = (req.query.userId as string) || req.user!.userId;
  const user = await User.findById(userId).lean();
  if (!user) {
    res.json({ success: true, data: { status: "offline" } });
    return;
  }
  res.json({ success: true, data: { status: user.status } });
});

router.put("/status", async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  const userId = req.body.userId || req.user!.userId;
  if (!status) throw new AppError(400, "Status is required");

  await User.findByIdAndUpdate(userId, { status });
  res.json({ success: true });
});

export default router;
