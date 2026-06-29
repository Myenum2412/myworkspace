import { Router, Response } from "express";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

async function enrichLogs(logs: Record<string, unknown>[]) {
  const userIds = [...new Set(logs.map((l) => l.userId as string).filter(Boolean))];
  const users = userIds.length > 0
    ? await User.find({ id: { $in: userIds } }, { id: 1, name: 1, avatar: 1 }).lean()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));

  return logs.map((log) => ({
    ...log,
    userName: userMap.get(log.userId as string)?.name || "Unknown",
    userAvatar: userMap.get(log.userId as string)?.avatar || null,
  }));
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || req.orgId || "";

  if (!orgId) {
    throw new AppError(400, "orgId is required");
  }

  const entityType = (req.query.entityType as string) || undefined;
  const action = (req.query.action as string) || undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
  const skip = (page - 1) * limit;

  const queryFilter: Record<string, unknown> = { orgId };
  if (entityType) {
    queryFilter.entityType = { $in: entityType.split(",") };
  }
  if (action) {
    queryFilter.action = { $regex: action, $options: "i" };
  }

  const [rawLogs, total] = await Promise.all([
    ActivityLog.find(queryFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ActivityLog.countDocuments(queryFilter),
  ]);

  const data = await enrichLogs(rawLogs);

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export default router;
