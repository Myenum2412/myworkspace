import { Router, Response } from "express";
import * as OTPAuth from "otpauth";
import { User } from "../lib/db/models/User.js";
import { Session } from "../lib/db/models/Session.js";
import { signToken } from "../config/auth.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireString } from "../lib/validate.js";
import { env } from "../config/env.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();

const ISSUER = "MyWorkSpace";

function generateTOTP(secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: "MyWorkSpace",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

router.post("/setup", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId });
  if (!user) throw new AppError(404, "User not found");

  if (user.twoFactorEnabled) {
    throw new AppError(400, "Two-factor authentication is already enabled");
  }

  const secret = new OTPAuth.Secret({ size: 20 });
  const base32Secret = secret.base32;

  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: user.email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });

  const otpauthUrl = totp.toString();

  user.twoFactorSecret = base32Secret;
  await user.save();

  res.json({
    success: true,
    data: {
      secret: base32Secret,
      otpauth_url: otpauthUrl,
    },
  });
});

router.post("/verify", authenticate, async (req: AuthRequest, res: Response) => {
  const token = requireString(req.body.token, "token", { min: 6, max: 6 });

  const user = await User.findOne({ id: req.user!.userId });
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorSecret) throw new AppError(400, "2FA not set up. Run setup first.");
  if (user.twoFactorEnabled) throw new AppError(400, "2FA is already enabled");

  const totp = generateTOTP(user.twoFactorSecret);
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    throw new AppError(400, "Invalid token");
  }

  user.twoFactorEnabled = true;
  await user.save();

  await recordAuditLog({
    orgId: req.user!.orgId || req.user!.userId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.enabled",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} enabled two-factor authentication`,
  });

  res.json({ success: true });
});

router.post("/disable", authenticate, async (req: AuthRequest, res: Response) => {
  const token = requireString(req.body.token, "token", { min: 6, max: 6 });

  const user = await User.findOne({ id: req.user!.userId });
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorEnabled) throw new AppError(400, "2FA is not enabled");

  const totp = generateTOTP(user.twoFactorSecret!);
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    throw new AppError(400, "Invalid token");
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();

  await recordAuditLog({
    orgId: req.user!.orgId || req.user!.userId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.disabled",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} disabled two-factor authentication`,
  });

  res.json({ success: true });
});

router.post("/challenge", async (req, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();

  const user = await User.findOne({ email });
  if (!user) {
    res.json({ success: true, data: { requiresTwoFactor: false } });
    return;
  }

  res.json({
    success: true,
    data: {
      requiresTwoFactor: user.twoFactorEnabled === true,
    },
  });
});

router.post("/login", async (req, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
  const token = requireString(req.body.token, "token", { min: 6, max: 6 });

  const user = await User.findOne({ email });
  if (!user) throw new AppError(401, "Invalid email or token");
  if (!user.twoFactorEnabled) throw new AppError(400, "2FA is not enabled for this account");
  if (!user.twoFactorSecret) throw new AppError(400, "2FA not configured");
  if (!user.isActive) throw new AppError(403, "Account is deactivated");

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked. Try again later.");
  }

  const totp = generateTOTP(user.twoFactorSecret);
  const delta = totp.validate({ token, window: 1 });

  if (delta === null) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    await user.save();
    throw new AppError(401, "Invalid token");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();
  user.status = "online";
  await user.save();

  const resolvedOrgId = user.orgId || "";

  await recordAuditLog({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} logged in with 2FA`,
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: user.id,
    orgId: resolvedOrgId,
    loginTime: new Date(),
    currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0,
    expiresAt,
  });

  await recordAuditLog({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "session.start",
    entityType: "session",
    entityId: session._id.toString(),
    description: `Session started for ${user.name} via 2FA`,
  });

  const jwtToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId: resolvedOrgId,
  });

  res.json({
    success: true,
    data: {
      token: jwtToken,
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

export default router;
