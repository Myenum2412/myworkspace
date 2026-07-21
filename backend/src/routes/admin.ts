import { Router, Response } from "express";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { authenticate } from "../middleware/auth.js";
import { processEvent } from "../services/notification-engine.service.js";
import { platformAdminOnly, auditLog } from "../middleware/authorize.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { cacheManager } from "../lib/cache.js";
import { ROLES, isPlatformRole, getEffectivePermissions } from "../lib/rbac/index.js";
import { permissionCache } from "../lib/permission-cache.js";

const router = Router();

router.use(authenticate);
router.use(platformAdminOnly());

router.get("/stats", async (_req: AuthRequest, res: Response) => {
  const [userCount, orgCount, orgMemberCount, taskCount, logCount] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    OrgMember.countDocuments(),
    (await import("../lib/db/models/Task.js")).Task.countDocuments(),
    ActivityLog.countDocuments(),
  ]);

  res.json({
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

router.get("/users", async (req: AuthRequest, res: Response) => {
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

  res.json({
    success: true,
    data: users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get("/users/:id", async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id).select("_id name email role permissions isActive status lastLogin createdAt").lean();
  if (!user) throw new AppError(404, "User not found");
  res.json({
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

router.patch("/users/:id/toggle-status", auditLog("user.status.toggle", "user"), async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError(404, "User not found");
  if (user.role === ROLES.ORG_ADMIN) throw new AppError(403, "Cannot deactivate another platform admin");
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

  res.json({ success: true, data: { isActive: user.isActive } });
});

router.get("/organizations", async (req: AuthRequest, res: Response) => {
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

  const orgIds = organizations.map(o => o._id);
  const memberCounts = await OrgMember.aggregate([
    { $match: { orgId: { $in: orgIds.map(id => id.toString()) } } },
    { $group: { _id: "$orgId", count: { $sum: 1 } } },
  ]);
  const memberCountMap = new Map(memberCounts.map(m => [m._id, m.count]));

  const data = organizations.map(org => ({
    id: org._id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    memberCount: memberCountMap.get(org._id.toString()) || 0,
    createdAt: org.createdAt,
  }));

  res.json({
    success: true,
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get("/logs", async (req: AuthRequest, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(limit).select("orgId userId entityType action entityId description metadata createdAt").lean();
  res.json({ success: true, data: logs });
});

router.get("/permissions", async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: getEffectivePermissions(ROLES.ORG_ADMIN) });
});

// ── Policy Audit ──
router.get("/policies/audit", async (_req: AuthRequest, res: Response) => {
  const { getCurrentVersion, getVersionHistory, getPolicyStats, getRecentChanges } = await import("../lib/casbin/policy-manager.js");

  const stats = await getPolicyStats();
  const versionHistory = getVersionHistory(10);
  const recentChanges = getRecentChanges(20);
  const cacheStats = permissionCache.getStats();

  res.json({
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
router.post("/policies/reload", async (req: AuthRequest, res: Response) => {
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

    res.json({
      success: true,
      data: {
        version: result.version,
        message: "Policies reloaded successfully",
      },
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error || "Failed to reload policies",
    });
  }
});

// ── Permission Cache Stats ──
router.get("/cache/stats", async (_req: AuthRequest, res: Response) => {
  const stats = permissionCache.getStats();

  res.json({
    success: true,
    data: stats,
  });
});

// ── Permission Cache Invalidation ──
router.post("/cache/invalidate", async (req: AuthRequest, res: Response) => {
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
    return res.status(400).json({
      success: false,
      error: "Invalid invalidation target. Use 'user', 'org', or 'all'.",
    });
  }

  res.json({
    success: true,
    data: {
      invalidated,
      message: target === "all" ? "All caches invalidated" : `Invalidated ${invalidated} entries`,
    },
  });
});

// ── Security Dashboard ──
router.get("/security/dashboard", async (_req: AuthRequest, res: Response) => {
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
  const securityMetrics = allMetrics.filter(m =>
    m.name.startsWith("auth_") ||
    m.name.startsWith("authorization_") ||
    m.name.startsWith("tenant_") ||
    m.name.startsWith("suspicious_") ||
    m.name.startsWith("session_") ||
    m.name.startsWith("device_") ||
    m.name.startsWith("rate_limit_") ||
    m.name.startsWith("audit_log_") ||
    m.name.startsWith("casbin_")
  );

  // Calculate summary counts
  const summary = {
    totalAuthEvents: securityMetrics
      .filter(m => m.name === "auth_events_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalAuthFailures: securityMetrics
      .filter(m => m.name === "auth_failures_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalAuthDenials: securityMetrics
      .filter(m => m.name === "authorization_denials_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalTenantViolations: securityMetrics
      .filter(m => m.name === "tenant_isolation_violations_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalSuspiciousActivity: securityMetrics
      .filter(m => m.name === "suspicious_activity_total")
      .reduce((sum, m) => sum + m.value, 0),
    totalRateLimitHits: securityMetrics
      .filter(m => m.name === "rate_limit_exceeded_total")
      .reduce((sum, m) => sum + m.value, 0),
  };

  res.json({
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
router.get("/security/metrics", async (_req: AuthRequest, res: Response) => {
  const { metricsRegistry } = await import("../lib/monitoring/index.js");

  const allMetrics = metricsRegistry.getMetrics();
  const securityMetrics = allMetrics.filter(m =>
    m.name.startsWith("auth_") ||
    m.name.startsWith("authorization_") ||
    m.name.startsWith("tenant_") ||
    m.name.startsWith("suspicious_") ||
    m.name.startsWith("session_") ||
    m.name.startsWith("device_") ||
    m.name.startsWith("rate_limit_") ||
    m.name.startsWith("audit_log_") ||
    m.name.startsWith("casbin_")
  );

  res.json({
    success: true,
    data: securityMetrics,
  });
});

// ── Audit Chain Verification ──
router.get("/security/audit-chain", async (req: AuthRequest, res: Response) => {
  const { verifyAuditChain } = await import("../services/audit.service.js");

  const orgId = req.query.orgId as string || "system";
  const startDate = req.query.startDate
    ? new Date(req.query.startDate as string)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const endDate = req.query.endDate
    ? new Date(req.query.endDate as string)
    : new Date();

  const result = await verifyAuditChain(orgId, startDate, endDate);

  res.json({
    success: true,
    data: result,
  });
});

export default router;
