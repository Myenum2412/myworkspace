import { Router, Response } from "express";
import { ActivityLog } from "../lib/db/models/ActivityLog";
import { AuthRequest, authenticate } from "../middleware/auth";
import { AppError } from "../middleware/error";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) throw new AppError(400, "orgId is required");

  const logs = await ActivityLog.find({ orgId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ success: true, data: logs });
});

export default router;
