import { Router, Response } from "express";
import { Task } from "../lib/db/models/Task.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { Project } from "../lib/db/models/Project.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { env } from "../config/env.js";
import { cacheManager, CacheKeys } from "../lib/cache.js";

const dbg = (...a: unknown[]) => { if (env.PERF_LOG === "1") console.log(...a); };

const router = Router();

router.use(authenticate);

async function resolveOrgId(req: AuthRequest): Promise<string> {
  if (req.user!.orgId) return req.user!.orgId;
  const userId = req.user!.userId;
  const member = await OrgMember.findOne({ userId }).select("orgId").lean();
  if (member) return member.orgId.toString();
  const { Organization } = await import("../lib/db/models/Organization.js");
  const anyOrg = await Organization.findOne({}).sort({ createdAt: 1 }).select("id").lean();
  if (anyOrg) {
    const { v4: uuid } = await import("uuid");
    await OrgMember.create({ id: uuid(), orgId: anyOrg.id, userId, role: "members", joinedAt: new Date() });
    return anyOrg.id;
  }
  throw new AppError(400, "No organization found. Please set up company details first.");
}

async function fetchDashboardMetrics(orgId: string) {
  const queryFilters = {
    totalTasks: { orgId },
    completedTasks: { orgId, status: "done" },
    inProgressTasks: { orgId, status: "in_progress" },
    overdueTasks: { orgId, dueDate: { $lt: new Date() }, status: { $ne: "done" } },
    activeMembers: { orgId },
    recentActivity: { orgId, createdAt: { $gt: new Date(Date.now() - 86400000) } },
  };

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

  return { totalTasks, completedTasks, inProgressTasks, overdueTasks, activeMembers, recentActivity };
}

router.get("/metrics", async (req: AuthRequest, res: Response, next) => {
  try {
    const orgId = req.orgId || await resolveOrgId(req);
    const cacheKey = CacheKeys.dashboardMetrics(orgId);
    const data = await cacheManager.getOrSet(cacheKey, () => fetchDashboardMetrics(orgId), 30);
    res.json({ success: true, data });
  } catch (err: any) {
    if (err.statusCode === 400) {
      return res.json({
        success: true,
        data: { totalTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0, activeMembers: 0, recentActivity: 0 }
      });
    }
    next(err);
  }
});

function buildMonthlyRange() {
  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    months.push({ label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }), start: d, end });
  }
  return months;
}

function estimateRevenue(projectsCreated: number, tasksCompleted: number): number {
  return projectsCreated * 5000 + tasksCompleted * 200;
}

function estimateExpenses(memberCount: number): number {
  return memberCount * 3000;
}

async function fetchProfitLossData(orgId: string) {
  const months = buildMonthlyRange();
  const memberCount = await OrgMember.countDocuments({ orgId });

  const results = await Promise.all(
    months.map(async (m) => {
      const [projectsCreated, tasksCompleted] = await Promise.all([
        Project.countDocuments({ orgId, createdAt: { $gte: m.start, $lte: m.end } }),
        Task.countDocuments({ orgId, status: "done", updatedAt: { $gte: m.start, $lte: m.end } }),
      ]);
      const revenue = estimateRevenue(projectsCreated, tasksCompleted);
      const expenses = estimateExpenses(memberCount);
      return { date: m.start.toISOString(), revenue, expenses, profit: revenue - expenses, projectsCreated, tasksCompleted, memberCount };
    })
  );
  return results;
}

router.get("/profit-loss", async (req: AuthRequest, res: Response, next) => {
  try {
    const orgId = (req.query.orgId as string) || req.orgId || await resolveOrgId(req);
    const cacheKey = `dashboard:${orgId}:profit-loss`;
    const data = await cacheManager.getOrSet(cacheKey, () => fetchProfitLossData(orgId), 120);
    res.json({ success: true, data });
  } catch (err: any) {
    if (err.statusCode === 400) {
      return res.json({ success: true, data: [] });
    }
    next(err);
  }
});

export default router;
