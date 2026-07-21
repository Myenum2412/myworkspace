import { Router, Response } from "express";
import jwt from "jsonwebtoken";
import { compare } from "bcryptjs";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { User } from "../lib/db/models/User.js";
import { Session } from "../lib/db/models/Session.js";
import { RefreshToken } from "../lib/db/models/RefreshToken.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { signToken, signRefreshToken, signDeviceToken } from "../config/auth.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { platformAdminOnly, orgAdminOnly } from "../middleware/authorize.js";
import { AppError } from "../middleware/error.js";
import { requireString, optionalString } from "../lib/validate.js";
import { env } from "../config/env.js";
import { recordAuditLog } from "../services/audit.service.js";
import * as totpService from "../services/totp.service.js";
import { processEvent } from "../services/notification-engine.service.js";
import { MfaSession } from "../lib/db/models/MfaSession.js";

const router = Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

function getAuditContext(req: AuthRequest): totpService.AuditContext {
  return {
    orgId: req.user?.orgId || req.user?.userId || "system",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string | undefined,
    correlationId: req.headers["x-correlation-id"] as string || req.headers["x-request-id"] as string,
    sessionId: req.headers["x-session-id"] as string,
  };
}

router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  const status = await totpService.getMfaStatus(req.user!.userId);
  res.json({ success: true, data: status });
});

router.post("/setup", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId }).select("id twoFactorEnabled email orgId");
  if (!user) throw new AppError(404, "User not found");
  if (user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is already enabled");

  const result = await totpService.setupTOTP(
    req.user!.userId,
    user.email,
    getAuditContext(req),
  );

  processEvent({
    userId: req.user!.userId,
    orgId: user.orgId || req.user!.userId,
    createdBy: req.user!.userId,
    type: "mfa_enabled",
    category: "auth",
    title: "Two-factor authentication setup initiated",
    message: "Two-factor authentication setup has been initiated",
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      secret: result.secret,
      otpauth_url: result.otpauthUrl,
      qr_code: result.qrCodeDataUrl,
    },
  });
});

router.post("/verify", authenticate, async (req: AuthRequest, res: Response) => {
  const token = requireString(req.body.token, "token", { min: 6, max: 6 });

  const result = await totpService.verifyAndEnableTOTP(
    req.user!.userId,
    token,
    getAuditContext(req),
  );

  await MfaSession.create({
    userId: req.user!.userId,
    sessionId: req.headers["x-session-id"] as string || "",
    verifiedAt: new Date(),
    method: "totp",
    claims: ["setup"],
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  processEvent({
    userId: req.user!.userId,
    orgId: req.user!.orgId || req.user!.userId,
    createdBy: req.user!.userId,
    type: "mfa_enabled",
    category: "auth",
    title: "Two-factor authentication enabled",
    message: "Two-factor authentication has been enabled",
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      recoveryCodes: result.recoveryCodes,
    },
  });
});

router.post("/disable", authenticate, async (req: AuthRequest, res: Response) => {
  const password = requireString(req.body.password, "password", { min: 1 });
  const token = optionalString(req.body.token, "token", { max: 6 });
  const recoveryCode = optionalString(req.body.recoveryCode, "recoveryCode", { max: 100 });

  const user = await User.findOne({ id: req.user!.userId }).select("id twoFactorEnabled password email orgId name");
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is not enabled");
  if (!user.password) throw new AppError(400, "Password authentication not configured");

  const validPassword = await compare(password, user.password);
  if (!validPassword) {
    throw new AppError(401, "Invalid password");
  }

  if (token) {
    const verified = await totpService.verifyTOTP(
      req.user!.userId,
      token,
      getAuditContext(req),
    );
    if (!verified) throw new AppError(400, "Invalid TOTP code");
  } else if (recoveryCode) {
    const verified = await totpService.verifyRecoveryCode(
      req.user!.userId,
      recoveryCode,
      getAuditContext(req),
    );
    if (!verified) throw new AppError(400, "Invalid recovery code");
  } else {
    throw new AppError(400, "Either a TOTP code or recovery code is required");
  }

  await totpService.disableTOTP(req.user!.userId, getAuditContext(req));

  processEvent({
    userId: req.user!.userId,
    orgId: req.user!.orgId || req.user!.userId,
    createdBy: req.user!.userId,
    type: "mfa_disabled",
    category: "auth",
    title: "Two-factor authentication disabled",
    message: "Two-factor authentication has been disabled",
  }).catch(() => {});

  res.json({ success: true });
});

router.post("/challenge", async (req, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();

  const user = await User.findOne({ email }).select("twoFactorEnabled twoFactorMethod").lean();
  if (!user || !user.twoFactorEnabled) {
    res.json({ success: true, data: { requiresTwoFactor: false, method: "none" } });
    return;
  }

  res.json({
    success: true,
    data: {
      requiresTwoFactor: true,
      method: user.twoFactorMethod || "totp",
    },
  });
});

router.post("/login", async (req, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
  const token = requireString(req.body.token, "token", { min: 6, max: 6 });
  const deviceFingerprint = optionalString(req.body.deviceFingerprint, "deviceFingerprint", { max: 256 });
  const trustDevice = req.body.trustDevice === true;

  const user = await User.findOne({ email }).select(
    "id email name role permissions status isActive lockedUntil failedLoginAttempts twoFactorEnabled twoFactorMethod orgId emailVerified image userNumber lastLogin tokenVersion"
  );
  if (!user) throw new AppError(401, "Invalid email or token");
  if (!user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is not enabled for this account");
  if (!user.isActive) throw new AppError(403, "Account is deactivated");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked. Try again later.");
  }

  const verified = await totpService.verifyTOTP(user.id, token, {
    orgId: user.orgId || user.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
  });

  if (!verified) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await user.save();
    throw new AppError(401, "Invalid authentication code");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();
  user.status = "online";
  await user.save();

  const resolvedOrgId = user.orgId || (await getUserPrimaryOrgId(user.id)) || "";
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  await MfaSession.create({
    userId: user.id,
    sessionId: uuid(),
    verifiedAt: new Date(),
    method: "totp",
    claims: ["login"],
    ipAddress,
    userAgent,
    trustedDevice: trustDevice && deviceFingerprint ? true : false,
    riskScore: 0,
    expiresAt: new Date(Date.now() + (trustDevice ? 30 : 1) * 24 * 60 * 60 * 1000),
  });

  await recordAuditLog({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} logged in with two-factor authentication from ${ipAddress}`,
    ipAddress,
    userAgent,
    metadata: { method: "totp" },
  });

  await Session.updateMany(
    { userId: user.id, logoutTime: { $exists: false } },
    {
      $set: { logoutTime: new Date(), currentStatus: "offline" },
      $push: { statusTransitions: { status: "offline", timestamp: new Date() } },
    },
  );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: user.id,
    orgId: resolvedOrgId,
    loginTime: new Date(),
    currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0,
    expiresAt,
    deviceFingerprint: deviceFingerprint || undefined,
    ipAddress,
    userAgent,
  });

  await recordAuditLog({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "session.start",
    entityType: "session",
    entityId: session._id.toString(),
    description: `Session started for ${user.name} via two-factor authentication`,
  });

  if (trustDevice && deviceFingerprint) {
    const deviceName = parseDeviceName(userAgent);
    await totpService.trustDevice(user.id, deviceFingerprint, deviceName, ipAddress, userAgent);
    await recordAuditLog({
      orgId: resolvedOrgId,
      userId: user.id,
      createdBy: user.id,
      action: "twoFactor.trust_device",
      entityType: "device",
      entityId: deviceFingerprint,
      description: `Device trusted for ${user.name}`,
      ipAddress,
      userAgent,
    });
  }

  const refreshFamily = uuid();
  const refreshTokenStr = signRefreshToken({
    userId: user.id,
    orgId: resolvedOrgId,
    tokenVersion: user.tokenVersion || 0,
    family: refreshFamily,
  });

  await RefreshToken.create({
    token: crypto.createHash("sha256").update(refreshTokenStr).digest("hex"),
    userId: user.id,
    orgId: resolvedOrgId,
    family: refreshFamily,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deviceFingerprint: deviceFingerprint || undefined,
    ipAddress,
    userAgent,
  });

  const jwtToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId: resolvedOrgId,
    tokenVersion: user.tokenVersion || 0,
  });

  processEvent({
    userId: user.id,
    orgId: resolvedOrgId,
    createdBy: user.id,
    type: "new_device_login",
    category: "auth",
    title: "New MFA login",
    message: `${user.name} logged in with two-factor authentication`,
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      token: jwtToken,
      refreshToken: refreshTokenStr,
      sessionId: session._id.toString(),
      user: {
        id: user.id,
        userNumber: user.userNumber,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        permissions: user.permissions || [],
        status: "online",
        orgId: resolvedOrgId,
        emailVerified: user.emailVerified || false,
      },
      orgId: resolvedOrgId,
    },
  });
});

router.post("/login-recovery", async (req, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
  const recoveryCode = requireString(req.body.recoveryCode, "recoveryCode", { min: 1 });
  const deviceFingerprint = optionalString(req.body.deviceFingerprint, "deviceFingerprint", { max: 256 });
  const trustDevice = req.body.trustDevice === true;

  const user = await User.findOne({ email }).select(
    "id email name role permissions status isActive lockedUntil failedLoginAttempts twoFactorEnabled twoFactorMethod orgId emailVerified image userNumber lastLogin tokenVersion"
  );
  if (!user) throw new AppError(401, "Invalid email or recovery code");
  if (!user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is not enabled for this account");
  if (!user.isActive) throw new AppError(403, "Account is deactivated");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked. Try again later.");
  }

  const verified = await totpService.verifyRecoveryCode(user.id, recoveryCode, {
    orgId: user.orgId || user.id,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
  });

  if (!verified) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await user.save();
    throw new AppError(401, "Invalid recovery code");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();
  user.status = "online";
  await user.save();

  const resolvedOrgId = user.orgId || (await getUserPrimaryOrgId(user.id)) || "";
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  await MfaSession.create({
    userId: user.id,
    sessionId: uuid(),
    verifiedAt: new Date(),
    method: "recovery_code",
    claims: ["login"],
    ipAddress,
    userAgent,
    trustedDevice: trustDevice && deviceFingerprint ? true : false,
    riskScore: 40,
    riskFactors: ["recovery_code_login"],
    expiresAt: new Date(Date.now() + (trustDevice ? 30 : 1) * 24 * 60 * 60 * 1000),
  });

  await recordAuditLog({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} logged in using recovery code from ${ipAddress}`,
    ipAddress,
    userAgent,
    metadata: { method: "recovery_code" },
    riskScore: 40,
    riskFactors: ["recovery_code_login"],
  });

  await Session.updateMany(
    { userId: user.id, logoutTime: { $exists: false } },
    {
      $set: { logoutTime: new Date(), currentStatus: "offline" },
      $push: { statusTransitions: { status: "offline", timestamp: new Date() } },
    },
  );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: user.id,
    orgId: resolvedOrgId,
    loginTime: new Date(),
    currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0,
    expiresAt,
    deviceFingerprint: deviceFingerprint || undefined,
    ipAddress,
    userAgent,
  });

  if (trustDevice && deviceFingerprint) {
    const deviceName = parseDeviceName(userAgent);
    await totpService.trustDevice(user.id, deviceFingerprint, deviceName, ipAddress, userAgent);
  }

  const refreshFamily = uuid();
  const refreshTokenStr = signRefreshToken({
    userId: user.id,
    orgId: resolvedOrgId,
    tokenVersion: user.tokenVersion || 0,
    family: refreshFamily,
  });

  await RefreshToken.create({
    token: crypto.createHash("sha256").update(refreshTokenStr).digest("hex"),
    userId: user.id,
    orgId: resolvedOrgId,
    family: refreshFamily,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deviceFingerprint: deviceFingerprint || undefined,
    ipAddress,
    userAgent,
  });

  const jwtToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId: resolvedOrgId,
    tokenVersion: user.tokenVersion || 0,
  });

  res.json({
    success: true,
    data: {
      token: jwtToken,
      refreshToken: refreshTokenStr,
      sessionId: session._id.toString(),
      user: {
        id: user.id,
        userNumber: user.userNumber,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        permissions: user.permissions || [],
        status: "online",
        orgId: resolvedOrgId,
        emailVerified: user.emailVerified || false,
      },
      orgId: resolvedOrgId,
    },
  });
});

router.get("/trusted-devices", authenticate, async (req: AuthRequest, res: Response) => {
  const devices = await totpService.getTrustedDevices(req.user!.userId);
  res.json({ success: true, data: devices });
});

router.post("/trust-device", authenticate, async (req: AuthRequest, res: Response) => {
  const deviceFingerprint = requireString(req.body.deviceFingerprint, "deviceFingerprint", { max: 256 });
  const deviceName = optionalString(req.body.deviceName, "deviceName", { max: 128 }) || "Unknown device";

  await totpService.trustDevice(
    req.user!.userId,
    deviceFingerprint,
    deviceName,
    req.ip,
    req.headers["user-agent"] as string,
  );

  await recordAuditLog({
    orgId: req.user!.orgId || req.user!.userId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "twoFactor.trust_device",
    entityType: "device",
    entityId: deviceFingerprint,
    description: `Device trusted`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    correlationId: getCorrelationId(req),
  });

  res.json({ success: true });
});

router.delete("/trusted-devices/:id", authenticate, async (req: AuthRequest, res: Response) => {
  await totpService.removeTrustedDevice(req.params.id, req.user!.userId);

  await recordAuditLog({
    orgId: req.user!.orgId || req.user!.userId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "twoFactor.remove_trusted_device",
    entityType: "device",
    entityId: req.params.id,
    description: `Trusted device removed`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    correlationId: getCorrelationId(req),
  });

  res.json({ success: true });
});

router.post("/recovery-codes", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId }).select("id twoFactorEnabled");
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication must be enabled first");

  const codes = await totpService.generateRecoveryCodesForUser(
    req.user!.userId,
    getAuditContext(req),
  );

  processEvent({
    userId: req.user!.userId,
    orgId: req.user!.orgId || req.user!.userId,
    createdBy: req.user!.userId,
    type: "backup_codes_generated",
    category: "security",
    title: "Backup codes generated",
    message: "New backup recovery codes have been generated",
  }).catch(() => {});

  res.json({
    success: true,
    data: { recoveryCodes: codes },
  });
});

router.get("/recovery-codes/status", authenticate, async (req: AuthRequest, res: Response) => {
  const status = await totpService.getRecoveryCodesStatus(req.user!.userId);
  res.json({ success: true, data: status });
});

router.get("/activity", authenticate, async (req: AuthRequest, res: Response) => {
  const { AuditLog } = await import("../lib/db/models/AuditLog.js");
  const activities = await AuditLog.find({
    userId: req.user!.userId,
    action: /^twoFactor\./,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("action description createdAt success ipAddress userAgent")
    .lean();

  res.json({ success: true, data: activities });
});

router.post("/admin/reset/:userId", authenticate, orgAdminOnly(), async (req: AuthRequest, res: Response) => {
  const targetUserId = req.params.userId;
  const adminUser = await User.findOne({ id: req.user!.userId }).select("id email role");
  if (!adminUser) throw new AppError(404, "Admin user not found");

  const targetUser = await User.findOne({ id: targetUserId }).select("id email name role orgId");
  if (!targetUser) throw new AppError(404, "Target user not found");

  if (targetUser.role === "org_admin" && adminUser.id !== targetUser.id) {
    throw new AppError(403, "Cannot reset MFA for another platform admin");
  }

  await totpService.adminResetMFA(targetUserId, req.user!.userId, {
    orgId: req.user!.orgId || req.user!.userId,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    correlationId: getCorrelationId(req),
  });

  processEvent({
    userId: targetUserId,
    orgId: req.user!.orgId || req.user!.userId,
    createdBy: req.user!.userId,
    type: "mfa_disabled",
    category: "auth",
    title: "MFA reset by admin",
    message: `MFA has been reset for user ${targetUserId} by admin`,
  }).catch(() => {});

  res.json({ success: true, message: "MFA has been reset for the user" });
});

async function getUserPrimaryOrgId(userId: string): Promise<string | null> {
  const member = await OrgMember.findOne({ userId }).select("orgId").lean();
  return member ? member.orgId : null;
}

function parseDeviceName(userAgent?: string): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  if (ua.includes("chrome")) return "Chrome";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("safari") && !ua.includes("chrome")) return "Safari";
  if (ua.includes("edge")) return "Edge";
  if (ua.includes("opera") || ua.includes("opr")) return "Opera";
  return "Unknown browser";
}

function getCorrelationId(req: AuthRequest): string | undefined {
  return (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    undefined;
}

router.post("/step-up", authenticate, async (req: AuthRequest, res: Response) => {
  const token = requireString(req.body.token, "token", { min: 6, max: 6 });

  const { verifyStepUp } = await import("../middleware/step-up-auth.js");
  const sessionId = req.headers["x-session-id"] as string || "";

  const verified = await verifyStepUp(req.user!.userId, sessionId, token);

  if (!verified) {
    throw new AppError(400, "Invalid verification code");
  }

  await MfaSession.create({
    userId: req.user!.userId,
    sessionId,
    verifiedAt: new Date(),
    method: "totp",
    claims: ["step_up"],
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    riskScore: 0,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  await recordAuditLog({
    orgId: req.user!.orgId || req.user!.userId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "twoFactor.step_up.verified",
    entityType: "user",
    entityId: req.user!.userId,
    description: `Step-up authentication verified`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    success: true,
  });

  res.json({ success: true, data: { verified: true } });
});

export default router;
