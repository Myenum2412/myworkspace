import { Router, Response } from "express";
import { z } from "zod";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { Notification } from "../lib/db/models/Notification.js";
import { Session as SessionModel } from "../lib/db/models/Session.js";
import { Project } from "../lib/db/models/Project.js";
import { Task } from "../lib/db/models/Task.js";
import { Client } from "../lib/db/models/Client.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { cacheManager, CacheKeys } from "../lib/cache.js";
import { isAdminRole, isPlatformRole, getEffectivePermissions, hasAnyRole, ROLES } from "../lib/rbac/index.js";
import { permissionCache } from "../lib/permission-cache.js";

const router = Router();
router.use(authenticate);

const bootstrapResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    image: z.string().optional(),
    role: z.string(),
    permissions: z.array(z.string()),
    status: z.string(),
    lastLogin: z.string().nullable().optional(),
    createdAt: z.string().nullable().optional(),
  }),
  organization: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    plan: z.string(),
    logo: z.string().optional().nullable(),
    subscriptionStatus: z.string().optional().nullable(),
    trialEnd: z.string().nullable().optional(),
    currentPeriodEnd: z.string().nullable().optional(),
    ownerId: z.string(),
    onboardingCompleted: z.boolean(),
  }).nullable(),
  orgId: z.string(),
  notifications: z.object({
    unreadCount: z.number(),
  }),
  members: z.array(z.object({}).passthrough()),
  recentSessions: z.array(z.object({
    loginTime: z.date().or(z.string()).optional(),
    logoutTime: z.date().or(z.string()).optional(),
    currentStatus: z.string().optional(),
  })),
  navigation: z.object({
    role: z.string(),
    orgId: z.string(),
  }),
  permissions: z.object({
    role: z.string(),
    allPermissions: z.array(z.string()),
    isAdmin: z.boolean(),
    isOrgAdmin: z.boolean(),
    isManager: z.boolean(),
  }),
  dashboard: z.object({
    totalTasks: z.number(),
    completedTasks: z.number(),
    inProgressTasks: z.number(),
    overdueTasks: z.number(),
    activeProjects: z.number(),
    totalMembers: z.number(),
    totalClients: z.number(),
    storageUsed: z.string().optional(),
  }),
  features: z.array(z.string()),
  serverTime: z.string(),
});

const perfLog = (msg: string, dur: number) => {
  if (process.env.PERF_LOG === "1" || process.env.NODE_ENV === "development") {
    console.log(`[PERF] ${msg}: ${dur.toFixed(1)}ms`);
  }
};

async function resolveOrgInfo(orgId?: string, userId?: string): Promise<{ orgId: string; org: Record<string, unknown> | null }> {
  if (userId && !orgId) {
    const member = await OrgMember.findOne({ userId }).lean().select("orgId").exec();
    if (member) {
      const org = await Organization.findById(member.orgId).lean()
        .select("id name slug plan logo subscriptionStatus trialEnd currentPeriodEnd ownerId onboardingCompleted")
        .exec();
      if (org) return { orgId: member.orgId, org: org as unknown as Record<string, unknown> };
    }
    return { orgId: "", org: null };
  }

  if (orgId) {
    const org = await Organization.findById(orgId).lean()
      .select("id name slug plan logo subscriptionStatus trialEnd currentPeriodEnd ownerId onboardingCompleted")
      .exec();
    if (org) return { orgId, org: org as unknown as Record<string, unknown> };
  }

  if (userId) {
    const member = await OrgMember.findOne({ userId }).lean().select("orgId").exec();
    if (member) {
      const org = await Organization.findById(member.orgId).lean()
        .select("id name slug plan logo subscriptionStatus trialEnd currentPeriodEnd ownerId onboardingCompleted")
        .exec();
      if (org) return { orgId: member.orgId, org: org as unknown as Record<string, unknown> };
    }
  }
  return { orgId: orgId || "", org: null };
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const t0 = Date.now();
  const { userId, email, role, orgId: jwtOrgId } = req.user!;

  const cacheKey = `bootstrap:v2:${userId}`;

  const cached = cacheManager.get(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached, fromCache: true });
  }

  const [orgInfo, userDoc, memberDoc, notificationCount, recentSessions] = await Promise.all([
    resolveOrgInfo(jwtOrgId, userId),
    User.findOne({ id: userId }).lean().select("id name email image role status permissions lastLogin createdAt").exec().catch(() => null),
    OrgMember.findOne({ userId }).lean().select("role orgId").exec().catch(() => null),
    Notification.countDocuments({ userId, read: false }).exec().catch(() => 0),
    SessionModel.find({ userId }).sort({ loginTime: -1 }).limit(3).lean().select("loginTime logoutTime currentStatus").exec().catch(() => []),
  ]);

  perfLog("bootstrap:user+org", Date.now() - t0);

  const { orgId, org } = orgInfo;
  const effectiveRole = role || userDoc?.role || memberDoc?.role || "staffs";
  const effectiveOrgId = orgId || jwtOrgId || userDoc?.orgId || "";

  // Use permission cache for effective permissions
  const rolePermissions = permissionCache.resolvePermissions(userId, effectiveRole, effectiveOrgId);
  const allPermissions: string[] = [...new Set([
    ...(userDoc?.permissions || []),
    ...(req.user?.permissions || []),
    ...rolePermissions,
  ])] as string[];

  const isAdmin = isAdminRole(effectiveRole);
  const isOrgAdmin = isAdminRole(effectiveRole);

  const t1 = Date.now();

  const [taskCounts, projectCount, clientCount, memberCount, storageStats] = effectiveOrgId
    ? await Promise.all([
        Task.aggregate([
          { $match: { orgId: effectiveOrgId } },
          { $group: {
              _id: null,
              total: { $sum: 1 },
              done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
              inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
              overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", new Date()] }, { $ne: ["$status", "done"] }] }, 1, 0] } },
            },
          },
        ]).exec().catch(() => []),
        Project.countDocuments({ orgId: effectiveOrgId }).exec().catch(() => 0),
        Client.countDocuments({ orgId: effectiveOrgId }).exec().catch(() => 0),
        OrgMember.countDocuments({ orgId: effectiveOrgId }).exec().catch(() => 0),
        FileAttachment.aggregate([
          { $match: { orgId: effectiveOrgId, deletedAt: null } },
          { $group: { _id: null, totalSize: { $sum: "$size" } } },
        ]).exec().catch(() => []),
      ])
    : await Promise.all([[], 0, 0, 0, []]);

  perfLog("bootstrap:dashboard-metrics", Date.now() - t1);

  const tc = (taskCounts as any[])[0] || { total: 0, done: 0, inProgress: 0, overdue: 0 };
  const totalStorage = (storageStats as any[])[0]?.totalSize || 0;

  const t2 = Date.now();

  const membersQuery = effectiveOrgId
    ? (async () => {
        const memberDocs = await OrgMember.find({ orgId: effectiveOrgId }).lean().select("userId role").exec();
        const userIds = memberDocs.map((m) => m.userId).filter(Boolean);
        let users: any[] = [];
        if (userIds.length > 0) {
          users = await User.find({ id: { $in: userIds } }).lean().select("id name email image status").exec();
        }
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        return memberDocs.map((m) => ({
          role: m.role,
          ...(userMap.get(m.userId) || {}),
        }));
      })()
    : Promise.resolve([]);

  const members = await membersQuery;
  perfLog("bootstrap:members", Date.now() - t2);

  function formatDate(d: unknown): string | null {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString();
    if (typeof d === "string") return d;
    try { return new Date(d as string).toISOString(); } catch { return null; }
  }

  const data = {
    user: {
      id: userId,
      name: (userDoc?.name as string) || email?.split("@")[0] || "User",
      email: email || (userDoc?.email as string) || "",
      image: (userDoc?.image as string) || "",
      role: effectiveRole,
      permissions: allPermissions,
      status: (userDoc?.status as string) || "offline",
      lastLogin: formatDate(userDoc?.lastLogin),
      createdAt: formatDate(userDoc?.createdAt),
    },
    organization: org ? {
      id: (org as any).id as string,
      name: (org as any).name as string,
      slug: (org as any).slug as string,
      plan: (org as any).plan as string,
      logo: (org as any).logo as string | null | undefined,
      subscriptionStatus: (org as any).subscriptionStatus as string | null | undefined,
      trialEnd: formatDate((org as any).trialEnd),
      currentPeriodEnd: formatDate((org as any).currentPeriodEnd),
      ownerId: (org as any).ownerId as string,
      onboardingCompleted: (org as any).onboardingCompleted === true,
    } : null,
    orgId: effectiveOrgId,
    notifications: { unreadCount: notificationCount },
    members,
    recentSessions: recentSessions.map((s: any) => ({
      loginTime: s.loginTime,
      logoutTime: s.logoutTime,
      currentStatus: s.currentStatus,
    })),
    navigation: { role: effectiveRole, orgId: effectiveOrgId },
    permissions: {
      role: effectiveRole,
      allPermissions,
      isAdmin,
      isOrgAdmin,
      isManager: hasAnyRole(effectiveRole, [ROLES.MEMBERS, ROLES.HR]),
    },
    dashboard: {
      totalTasks: tc.total as number,
      completedTasks: tc.done as number,
      inProgressTasks: tc.inProgress as number,
      overdueTasks: tc.overdue as number,
      activeProjects: projectCount as number,
      totalMembers: memberCount as number,
      totalClients: clientCount as number,
      storageUsed: totalStorage ? `${(totalStorage / (1024 * 1024)).toFixed(1)}MB` : undefined,
    },
    features: isAdmin
      ? ["dashboard", "projects", "tasks", "clients", "employees", "files", "billing", "settings", "approvals", "reports", "calendar", "time", "blog"]
      : effectiveRole === ROLES.HR
        ? ["dashboard", "employees", "attendance", "leave", "payroll", "recruitment", "onboarding", "documents", "performance", "reports"]
        : effectiveRole === ROLES.FINANCE
          ? ["dashboard", "billing", "invoices", "expenses", "reports", "files"]
          : effectiveRole === ROLES.MANAGER
            ? ["dashboard", "projects", "tasks", "teams", "approvals", "reports", "files", "calendar"]
            : effectiveRole === ROLES.TEAM_LEADER
              ? ["dashboard", "tasks", "teams", "approvals", "files"]
              : effectiveRole === ROLES.CONTRACTORS
                ? ["dashboard", "tasks", "files", "communications"]
                : effectiveRole === ROLES.CLIENTS
                  ? ["portal", "projects", "files", "invoices", "messages", "approvals"]
                  : effectiveRole === ROLES.GUEST
                    ? ["shared"]
                    : ["dashboard", "tasks", "files", "calendar", "time"],
    serverTime: new Date().toISOString(),
  };

  const parseResult = bootstrapResponseSchema.safeParse(data);
  if (!parseResult.success) {
    console.error("[BOOTSTRAP] Schema validation failed:", parseResult.error.issues);
  }

  cacheManager.set(cacheKey, data, 30);

  const totalTime = Date.now() - t0;
  perfLog("bootstrap:total", totalTime);

  res.json({ success: true, data, serverTiming: `bootstrap;dur=${totalTime}` });
});

export default router;
