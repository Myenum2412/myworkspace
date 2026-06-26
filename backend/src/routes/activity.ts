import { Router, Response } from "express";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  console.log(`[ACTIVITY] ========== GET / START ==========`);
  console.log(`[ACTIVITY] GET / called, query:`, req.query);
  console.log(`[ACTIVITY] req.orgId (from middleware): ${req.orgId || 'NOT SET'}`);
  console.log(`[ACTIVITY] req.user:`, JSON.stringify(req.user));
  const orgId = (req.query.orgId as string) || req.orgId || "";
  console.log(`[ACTIVITY] Final orgId being used: ${orgId}`);
  
  if (!orgId) {
    console.log(`[ACTIVITY] ERROR: orgId is required but not found`);
    throw new AppError(400, "orgId is required");
  }

  const queryFilter = { orgId };
  console.log(`[ACTIVITY] Query filter:`, JSON.stringify(queryFilter));

  const logs = await ActivityLog.find(queryFilter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  console.log(`[ACTIVITY] Found ${logs.length} logs`);
  console.log(`[ACTIVITY] First log sample:`, logs[0] || 'none');
  console.log(`[ACTIVITY] ========== GET / END ==========`);
  res.json({ success: true, data: logs });
});

export default router;
