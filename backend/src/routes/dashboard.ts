import { Router, Response } from "express";
import { Task } from "../lib/db/models/Task.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

// Helper: resolve orgId from token or membership
async function resolveOrgId(req: AuthRequest): Promise<string> {
  console.log(`[DASHBOARD] resolveOrgId called, req.user:`, JSON.stringify(req.user));
  if (req.user!.orgId) {
    console.log(`[DASHBOARD] Using orgId from token: ${req.user!.orgId}`);
    return req.user!.orgId;
  }
  const userId = req.user!.userId;
  console.log(`[DASHBOARD] No orgId in token, looking up OrgMember for userId: ${userId}`);
  const member = await OrgMember.findOne({ userId }).lean();
  if (member) {
    console.log(`[DASHBOARD] Found OrgMember:`, JSON.stringify(member));
    return member.orgId.toString();
  }
  console.log(`[DASHBOARD] No OrgMember found for userId: ${userId}`);
  throw new AppError(400, "User is not associated with an organization");
}

router.get("/metrics", async (req: AuthRequest, res: Response) => {
  console.log(`[DASHBOARD] ========== GET /metrics START ==========`);
  console.log(`[DASHBOARD] GET /metrics called, query:`, req.query);
  console.log(`[DASHBOARD] req.orgId (from middleware): ${req.orgId || 'NOT SET'}`);
  console.log(`[DASHBOARD] req.user:`, JSON.stringify(req.user));
  const orgId = (req.query.orgId as string) || req.orgId || await resolveOrgId(req);
  console.log(`[DASHBOARD] Final orgId being used: ${orgId}`);

  const queryFilters = {
    totalTasks: { orgId },
    completedTasks: { orgId, status: "done" },
    inProgressTasks: { orgId, status: "in_progress" },
    overdueTasks: { orgId, dueDate: { $lt: new Date() }, status: { $ne: "done" } },
    activeMembers: { orgId },
    recentActivity: { orgId, createdAt: { $gt: new Date(Date.now() - 86400000) } },
  };
  console.log(`[DASHBOARD] Query filters:`, JSON.stringify(queryFilters, null, 2));

  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    activeMembers,
    recentActivity,
  ] = await Promise.all([
    Task.countDocuments(queryFilters.totalTasks),
    Task.countDocuments(queryFilters.completedTasks),
    Task.countDocuments(queryFilters.inProgressTasks),
    Task.countDocuments(queryFilters.overdueTasks),
    OrgMember.countDocuments(queryFilters.activeMembers),
    ActivityLog.countDocuments(queryFilters.recentActivity),
  ]);

  const result = {
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    activeMembers,
    recentActivity,
  };
  console.log(`[DASHBOARD] Query results:`, JSON.stringify(result));
  console.log(`[DASHBOARD] ========== GET /metrics END ==========`);

  res.json({
    success: true,
    data: result,
  });
});

export default router;
