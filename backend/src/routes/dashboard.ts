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
  if (req.user!.orgId) return req.user!.orgId;
  const member = await OrgMember.findOne({ userId: req.user!.userId }).lean();
  if (member) return member.orgId.toString();
  throw new AppError(400, "User is not associated with an organization");
}

router.get("/metrics", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await resolveOrgId(req);

  const [
    totalTasks,
    completedTasks,
    inProgressTasks,
    overdueTasks,
    activeMembers,
    recentActivity,
  ] = await Promise.all([
    Task.countDocuments({ orgId }),
    Task.countDocuments({ orgId, status: "done" }),
    Task.countDocuments({ orgId, status: "in_progress" }),
    Task.countDocuments({ orgId, dueDate: { $lt: new Date() }, status: { $ne: "done" } }),
    OrgMember.countDocuments({ orgId }),
    ActivityLog.countDocuments({
      orgId,
      createdAt: { $gt: new Date(Date.now() - 86400000) },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      activeMembers,
      recentActivity,
    },
  });
});

export default router;
