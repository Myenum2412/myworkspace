import { Router } from "express";
import { Task } from "../lib/db/models/Task.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { env } from "../config/env.js";
// Per-request dashboard logging gated behind PERF_LOG=1 (see auth.ts dbg helper).
// These routes are hot (loaded on every navigation to /dashboard) and each line
// is synchronous stdout — real cost under load.
const dbg = (...a) => { if (env.PERF_LOG === "1")
    console.log(...a); };
const router = Router();
router.use(authenticate);
// Helper: resolve orgId from token or membership
async function resolveOrgId(req) {
    dbg(`[DASHBOARD] resolveOrgId called, req.user:`, JSON.stringify(req.user));
    if (req.user.orgId) {
        dbg(`[DASHBOARD] Using orgId from token: ${req.user.orgId}`);
        return req.user.orgId;
    }
    const userId = req.user.userId;
    dbg(`[DASHBOARD] No orgId in token, looking up OrgMember for userId: ${userId}`);
    const member = await OrgMember.findOne({ userId }).lean();
    if (member) {
        dbg(`[DASHBOARD] Found OrgMember:`, JSON.stringify(member));
        return member.orgId.toString();
    }
    dbg(`[DASHBOARD] No OrgMember found for userId: ${userId}`);
    const { Organization } = await import("../lib/db/models/Organization.js");
    const anyOrg = await Organization.findOne({}).sort({ createdAt: 1 }).lean();
    if (anyOrg) {
        const { v4: uuid } = await import("uuid");
        await OrgMember.create({ id: uuid(), orgId: anyOrg.id, userId, role: "admin", joinedAt: new Date() });
        return anyOrg.id;
    }
    throw new AppError(400, "No organization found. Please set up company details first.");
}
router.get("/metrics", async (req, res) => {
    dbg(`[DASHBOARD] ========== GET /metrics START ==========`);
    dbg(`[DASHBOARD] GET /metrics called, query:`, req.query);
    dbg(`[DASHBOARD] req.orgId (from middleware): ${req.orgId || 'NOT SET'}`);
    dbg(`[DASHBOARD] req.user:`, JSON.stringify(req.user));
    const orgId = req.query.orgId || req.orgId || await resolveOrgId(req);
    dbg(`[DASHBOARD] Final orgId being used: ${orgId}`);
    const queryFilters = {
        totalTasks: { orgId },
        completedTasks: { orgId, status: "done" },
        inProgressTasks: { orgId, status: "in_progress" },
        overdueTasks: { orgId, dueDate: { $lt: new Date() }, status: { $ne: "done" } },
        activeMembers: { orgId },
        recentActivity: { orgId, createdAt: { $gt: new Date(Date.now() - 86400000) } },
    };
    dbg(`[DASHBOARD] Query filters:`, JSON.stringify(queryFilters, null, 2));
    const [totalTasks, completedTasks, inProgressTasks, overdueTasks, activeMembers, recentActivity,] = await Promise.all([
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
    dbg(`[DASHBOARD] Query results:`, JSON.stringify(result));
    dbg(`[DASHBOARD] ========== GET /metrics END ==========`);
    res.json({
        success: true,
        data: result,
    });
});
export default router;
