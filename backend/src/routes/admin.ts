// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { cacheManager } from "../lib/cache.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { permissionCache } from "../lib/permission-cache.js";
import { getEffectivePermissions, isPlatformRole, ROLES } from "../lib/rbac/index.js";
import { authenticate } from "../middleware/auth.js";
import { auditLog, platformAdminOnly } from "../middleware/authorize.js";
import { AppError } from "../middleware/error.js";
import { processEvent } from "../services/notification-engine.service.js";
import type { AuthRequest } from "../types/index.js";

export default async function plugin(fastify: FastifyInstance) {
router.use(platformAdminOnly());

fastify.get("/stats", async (_req: AuthRequest, reply: any) => {
  const [userCount, orgCount, orgMemberCount, taskCount, logCount] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    OrgMember.countDocuments(),
    (await import("../lib/db/models/Task.js")).Task.countDocuments(),
    ActivityLog.countDocuments(),
  ]);

  reply.send({
    success: true,
    data: {
      users: userCount,
      organizations: orgCount,
      orgMembers: orgMemberCount,
      tasks: taskCount,
      activityLogs: logCount,
    },
  });
});

fastify.get("/users", async (req: AuthRequest, reply: any) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name email role permissions isActive status lastLogin createdAt")
      .lean(),
    User.countDocuments(),
  ]);

  reply.send({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

fastify.get("/users/:id", async (req: AuthRequest, reply: any) => {
  const user = await User.findById(req.params.id)
    .select("_id name email role permissions isActive status lastLogin createdAt")
    .lean();
  if (!user) throw new AppError(404, "User not found");
  reply.send({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      status: user.status,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    },
  });
});

fastify.get(
  "/users/:id/toggle-status",
  auditLog("user.status.toggle", "user"),
  async (req: AuthRequest, reply: any) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, "User not found");
    if (user.role === ROLES.ORG_ADMIN)
      throw new AppError(403, "Cannot deactivate another platform admin");
    user.isActive = !user.isActive;
    await user.save();
    cacheManager.invalidatePattern(`user:${req.params.id}:profile`);

    processEvent({
      userId: req.params.id,
      orgId: req.user!.orgId || req.user!.userId,
      createdBy: req.user!.userId,
      type: user.isActive ? "account_reactivated" : "account_suspended",
      category: "auth",
      title: user.isActive ? "Account reactivated" : "Account suspended",
      message: `User account has been ${user.isActive ? "reactivated" : "suspended"}`,
    }).catch(() => {});

    reply.send({ success: true, data: { isActive: user.isActive } });
  },
);

fastify.get("/organizations", async (req: AuthRequest, reply: any) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const [organizations, total] = await Promise.all([
    Organization.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name slug plan createdAt")
      .lean(),
    Organization.countDocuments(),
  ]);

  const orgIds = organizations.map((o) => o._id);
  const memberCounts = await OrgMember.aggregate([
    { $match: { orgId: { $in: orgIds.map((id) => id.toString()) } } },
    { $group: { _id: "$orgId", count: { $sum: 1 } } },
  ]);
  const memberCountMap = new Map(memberCounts.map((m) => [m._id, m.count]));

  const data = organizations.map((org) => ({
    id: org._id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    memberCount: memberCountMap.get(org._id.toString()) || 0,
    createdAt: org.createdAt,
  }));

  reply.send({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

fastify.get("/logs", async (req: AuthRequest, reply: any) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const logs = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("orgId userId entityType action entityId description metadata createdAt")
    .lean();
  reply.send({ success: true, data: logs });
});

fastify.get("/permissions", async (_req: AuthRequest, reply: any) => {
  reply.send({ success: true, data: getEffectivePermissions(ROLES.ORG_ADMIN) });
});

// ── Policy Audit ──
fastify.get("/policies/audit", async (_req: AuthRequest, reply: any) => {
  const { getCurrentVersion, getVersionHistory, getPolicyStats, getRecentChanges } = await import(
    "../lib/casbin/policy-manager.js"
  );

  const stats = await getPolicyStats();
  const versionHistory = getVersionHistory(10);
  const recentChanges = getRecentChanges(20);
  const cacheStats = permissionCache.getStats();

  reply.send({
    success: true,
    data: {
      policy: stats,
      versions: versionHistory,
      recentChanges,
      cache: cacheStats,
    },
  });
});

// ── Policy Reload ──
fastify.get("/policies/reload", async (req: AuthRequest, reply: any) => {
  const { reloadPolicies } = await import("../lib/casbin/policy-manager.js");

  const result = await reloadPolicies(
    `Manual reload by ${req.user?.userId}`,
    req.user?.userId || "admin",
  );

  if (result.success) {
    processEvent({
      userId: req.user!.userId,
      orgId: req.user!.orgId || req.user!.userId,
      createdBy: req.user!.userId,
      type: "platform_update",
      category: "system",
      title: "Policies reloaded",
      message: "Authorization policies have been reloaded",
    }).catch(() => {});

    reply.send({
      success: true,
      data: {
        version: result.version,
        message: "Policies reloaded successfully",
      },
    });
  } else {
    reply.send(400).json({
      success: false,
      error: result.error || "Failed to reload policies",
    });
  }
});

// ── Permission Cache Stats ──
fastify.get("/cache/stats", async (_req: AuthRequest, reply: any) => {
  const stats = permissionCache.getStats();

  reply.send({
    success: true,
    data: stats,
  });
});

// ── Permission Cache Invalidation ──
fastify.get("/cache/invalidate", async (req: AuthRequest, reply: any) => {
  const { target, id } = req.body;

  let invalidated = 0;
  if (target === "user" && id) {
    invalidated = permissionCache.invalidateUser(id);
  } else if (target === "org" && id) {
    invalidated = permissionCache.invalidateOrg(id);
  } else if (target === "all") {
    permissionCache.invalidateAll();
    invalidated = -1;
  } else {
    return reply.send(400).json({
      success: false,
      error: "Invalid invalidation target. Use 'user', 'org', or 'all'.",
    });
  }

  reply.send({
    success: true,
    data: {
      invalidated,
      message: target === "all" ? "All caches invalidated" : `Invalidated ${invalidated} entries`,
    },
  });
});

// ── Security Dashboard ──
fastify.get("/security/dashboard", async (_req: AuthRequest, reply: any) => {
  const { getSecurityHealthScore, metricsRegistry } = await import("../lib/monitoring/index.js");
  const { getAuditStats } = await import("../services/audit.service.js");
  const { permissionCache } = await import("../lib/permission-cache.js");

  // Get security health score
  const healthScore = getSecurityHealthScore();

  // Get recent audit stats (last 24 hours)
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const auditStats = await getAuditStats("system", last24h, now);

  // Get permission cache stats
  const cacheStats = permissionCache.getStats();

  // Get security metrics summary
  const allMetrics = metricsRegistry.getMetrics();
  const securityMetrics = allMetrics.filter(
    (m) =>
      m.name.startsWith("auth_") ||
      m.name.startsWith("authorization_") ||
      m.name.startsWith("tenant_") ||
      m.name.startsWith("suspicious_") ||
      m.name.startsWith("session_") ||
      m.name.startsWith("device_") ||
      m.name.startsWith("rate_limit_") ||
      m.name.startsWith("audit_log_") ||
      m.name.startsWith("casbin_"),
  );

  // Calculate summary counts
  const summary = {
    totalAuthEvents: securityMetrics
      .filter((m) => m.name === "auth_events_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalAuthFailures: securityMetrics
      .filter((m) => m.name === "auth_failures_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalAuthDenials: securityMetrics
      .filter((m) => m.name === "authorization_denials_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalTenantViolations: securityMetrics
      .filter((m) => m.name === "tenant_isolation_violations_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalSuspiciousActivity: securityMetrics
      .filter((m) => m.name === "suspicious_activity_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalRateLimitHits: securityMetrics
      .filter((m) => m.name === "rate_limit_exceeded_total")
      .reduce((sum, m) => sum + m.value, 0),
  };

  reply.send({
    success: true,
    data: {
      healthScore,
      auditStats,
      cacheStats,
      summary,
      metrics: securityMetrics.slice(0, 50), // Limit to 50 metrics
      timestamp: now.toISOString(),
    },
  });
});

// ── Security Metrics ──
fastify.get("/security/metrics", async (_req: AuthRequest, reply: any) => {
  const { metricsRegistry } = await import("../lib/monitoring/index.js");

  const allMetrics = metricsRegistry.getMetrics();
  const securityMetrics = allMetrics.filter(
    (m) =>
      m.name.startsWith("auth_") ||
      m.name.startsWith("authorization_") ||
      m.name.startsWith("tenant_") ||
      m.name.startsWith("suspicious_") ||
      m.name.startsWith("session_") ||
      m.name.startsWith("device_") ||
      m.name.startsWith("rate_limit_") ||
      m.name.startsWith("audit_log_") ||
      m.name.startsWith("casbin_"),
  );

  reply.send({
    success: true,
    data: securityMetrics,
  });
});

// ── Audit Chain Verification ──
fastify.get("/security/audit-chain", async (req: AuthRequest, reply: any) => {
  const { verifyAuditChain } = await import("../services/audit.service.js");

  const orgId = (req.query.orgId as string) || "system";
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

  const result = await verifyAuditChain(orgId, startDate, endDate);

  reply.send({
    success: true,
    data: result,
  });
});
}
