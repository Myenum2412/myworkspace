import { Router, Response } from "express";
import { User } from "../lib/db/models/User.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { AuditLog } from "../lib/db/models/AuditLog.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { RecoveryCode } from "../lib/db/models/RecoveryCode.js";
import { TrustedDevice } from "../lib/db/models/TrustedDevice.js";
import { MfaSession } from "../lib/db/models/MfaSession.js";
import { authenticate } from "../middleware/auth.js";
import { platformAdminOnly, orgAdminOnly, auditLog } from "../middleware/authorize.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { OrgMfaPolicy } from "../lib/db/models/OrgMfaPolicy.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();

router.use(authenticate);
router.use(platformAdminOnly());

router.get("/mfa/stats", async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    mfaEnabled,
    mfaPending,
    totalRecoveryCodes,
    usedRecoveryCodes,
    trustedDeviceCount,
    totalMfaSessions,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ twoFactorEnabled: true }),
    User.countDocuments({ twoFactorPendingSecret: { $ne: null }, twoFactorEnabled: false }),
    RecoveryCode.countDocuments(),
    RecoveryCode.countDocuments({ used: true }),
    TrustedDevice.countDocuments({ expiresAt: { $gt: new Date() } }),
    MfaSession.countDocuments({ expiresAt: { $gt: new Date() } }),
  ]);

  const mfaAdoptionRate = totalUsers > 0 ? Math.round((mfaEnabled / totalUsers) * 100) : 0;

  res.json({
    success: true,
    data: {
      totalUsers,
      mfaEnabled,
      mfaPending,
      mfaAdoptionRate,
      totalRecoveryCodes,
      usedRecoveryCodes,
      trustedDeviceCount,
      activeMfaSessions: totalMfaSessions,
      pendingEnrollments: mfaPending,
    },
  });
});

router.get("/mfa/users", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;
  const mfaFilter = req.query.mfaFilter as string | undefined;

  const filter: Record<string, any> = {};
  if (mfaFilter === "enabled") filter.twoFactorEnabled = true;
  else if (mfaFilter === "pending") filter.twoFactorPendingSecret = { $ne: null };
  else if (mfaFilter === "disabled") filter.twoFactorEnabled = false;

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("name email role twoFactorEnabled twoFactorMethod twoFactorEnabledAt twoFactorLastVerifiedAt isActive createdAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  const enriched = await Promise.all(users.map(async (u) => {
    const recoveryStats = await Promise.all([
      RecoveryCode.countDocuments({ userId: u.id }),
      RecoveryCode.countDocuments({ userId: u.id, used: true }),
    ]);
    const deviceCount = await TrustedDevice.countDocuments({ userId: u.id, expiresAt: { $gt: new Date() } });

    return {
      ...u,
      recoveryCodesTotal: recoveryStats[0],
      recoveryCodesUsed: recoveryStats[1],
      trustedDevices: deviceCount,
    };
  }));

  res.json({
    success: true,
    data: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get("/mfa/activity", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    AuditLog.find({ action: /^twoFactor\.|^user\.login|^session\.|^login\./ })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("action description userId createdAt success ipAddress userAgent riskScore")
      .lean(),
    AuditLog.countDocuments({ action: /^twoFactor\.|^user\.login|^session\.|^login\./ }),
  ]);

  const userIds = [...new Set(entries.map((e) => e.userId).filter(Boolean))];
  const users = await User.find({ id: { $in: userIds } })
    .select("id name email")
    .lean();

  const userMap = new Map(users.map((u) => [u.id, u]));

  const enriched = entries.map((e) => ({
    ...e,
    user: userMap.get(e.userId) || null,
  }));

  res.json({
    success: true,
    data: enriched,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get("/mfa/risk-events", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    AuditLog.find({ riskScore: { $gte: 30 } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("action description userId createdAt riskScore riskFactors ipAddress userAgent")
      .lean(),
    AuditLog.countDocuments({ riskScore: { $gte: 30 } }),
  ]);

  res.json({
    success: true,
    data: entries,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

router.get("/mfa/failed-logins", async (req: AuthRequest, res: Response) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const failedLogins = await AuditLog.find({
    action: "login.failed",
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .select("userId description createdAt ipAddress")
    .lean();

  const uniqueIps = new Set(failedLogins.map((l) => l.ipAddress).filter(Boolean));
  const uniqueUsers = new Set(failedLogins.map((l) => l.userId).filter(Boolean));

  res.json({
    success: true,
    data: {
      totalFailed: failedLogins.length,
      uniqueIps: uniqueIps.size,
      uniqueUsers: uniqueUsers.size,
      recentFailures: failedLogins.slice(0, 50),
    },
  });
});

router.get("/mfa/adoption", async (req: AuthRequest, res: Response) => {
  const roleBreakdown = await User.aggregate([
    {
      $group: {
        _id: "$role",
        total: { $sum: 1 },
        enabled: { $sum: { $cond: ["$twoFactorEnabled", 1, 0] } },
        pending: { $sum: { $cond: [{ $and: [{ $ne: ["$twoFactorPendingSecret", null] }, { $eq: ["$twoFactorEnabled", false] }] }, 1, 0] } },
      },
    },
  ]);

  res.json({
    success: true,
    data: roleBreakdown.map((r) => ({
      role: r._id,
      total: r.total,
      enabled: r.enabled,
      pending: r.pending,
      adoptionRate: r.total > 0 ? Math.round((r.enabled / r.total) * 100) : 0,
    })),
  });
});

export default router;
