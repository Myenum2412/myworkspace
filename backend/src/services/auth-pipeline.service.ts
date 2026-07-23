import { compare } from "bcryptjs";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { User } from "../lib/db/models/User.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { Session } from "../lib/db/models/Session.js";
import { RefreshToken } from "../lib/db/models/RefreshToken.js";
import { signToken, signRefreshToken } from "../config/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type AuthMethod = "password" | "oauth" | "sso" | "api_key" | "recovery_code" | "impersonation";

export interface AuthPipelineOptions {
  email: string;
  password?: string;
  deviceFingerprint?: string;
  authMethod: AuthMethod;
  ipAddress?: string;
  userAgent?: string;
  orgId?: string;
}

export interface AuthPipelineResult {
  success: boolean;
  requiresTwoFactor: boolean;
  token?: string;
  refreshToken?: string;
  sessionId?: string;
  user?: {
    id: string;
    userNumber?: number;
    name: string;
    email: string;
    image?: string;
    role: string;
    permissions: string[];
    orgId: string;
    emailVerified: boolean;
  };
  orgId?: string;
  riskScore: number;
  riskLevel: string;
}

export async function executeAuthPipeline(opts: AuthPipelineOptions): Promise<AuthPipelineResult> {
  const user = await resolveUser(opts.email);
  if (!user) throw new AppError(401, "Invalid credentials");

  const isStaffUser = "isActive" in user;

  await validateAccountStatus(user);
  if (opts.password && "password" in user && user.password) {
    await verifyPassword(user, opts.password);
  }

  const resolvedOrgId = isStaffUser
    ? (user as any).orgId || await getPrimaryOrgId((user as any).id) || ""
    : (user as any).orgId || "";

  clearFailedAttempts(user);

  const ipAddress = opts.ipAddress || reqIp();
  const userAgent = opts.userAgent || "unknown";

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: (user as any).id,
    orgId: resolvedOrgId,
    loginTime: new Date(),
    currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0,
    expiresAt,
    deviceFingerprint: opts.deviceFingerprint || undefined,
    ipAddress,
    userAgent,
  });

  await logAuditEvent("user.login", user, resolvedOrgId, {
    ipAddress, userAgent, riskScore: 0, riskLevel: "low",
    metadata: { authMethod: opts.authMethod },
  });

  const [refreshFamily, jwtToken, refreshTokenStr] = await issueTokens(user, resolvedOrgId, ipAddress, userAgent, opts.deviceFingerprint);

  return {
    success: true,
    requiresTwoFactor: false,
    token: jwtToken,
    refreshToken: refreshTokenStr,
    sessionId: session._id.toString(),
    user: buildUserResponse(user, resolvedOrgId),
    orgId: resolvedOrgId,
    riskScore: 0,
    riskLevel: "low",
  };
}

async function resolveUser(email: string): Promise<any> {
  let user = await User.findOne({ email }).select(
    "id userNumber email password name role permissions status isActive lockedUntil failedLoginAttempts orgId emailVerified image lastLogin tokenVersion createdBy"
  ).lean();

  if (!user) {
    user = await ClientUser.findOne({ email }).select(
      "id email password name isActive lockedUntil failedLoginAttempts lastLogin orgId clientId"
    ).lean() as any;
  }

  return user;
}

async function validateAccountStatus(user: any): Promise<void> {
  if (!user.isActive) {
    throw new AppError(403, "Account is deactivated");
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked. Try again later.");
  }
}

async function verifyPassword(user: any, password: string): Promise<void> {
  if (!user.password) {
    throw new AppError(401, "Invalid credentials");
  }

  const valid = await compare(password, user.password);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await saveUserChange(user);

    await recordAuditLog({
      orgId: user.orgId || user.id,
      userId: user.id,
      createdBy: user.id,
      action: "login.failed",
      entityType: "user",
      entityId: user.id,
      description: `Failed login for ${user.email}`,
      success: false,
      failureReason: "Invalid password",
      riskScore: user.failedLoginAttempts >= 5 ? 40 : user.failedLoginAttempts >= 3 ? 20 : 5,
      riskFactors: ["failed_authentication"],
    });

    throw new AppError(401, "Invalid email or password");
  }
}

async function issueTokens(user: any, orgId: string, ipAddress: string, userAgent: string, deviceFingerprint?: string): Promise<[string, string, string]> {
  const refreshFamily = uuid();
  const refreshTokenStr = signRefreshToken({
    userId: user.id,
    orgId,
    tokenVersion: user.tokenVersion || 0,
    family: refreshFamily,
  });

  await RefreshToken.create({
    token: crypto.createHash("sha256").update(refreshTokenStr).digest("hex"),
    userId: user.id,
    orgId,
    family: refreshFamily,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deviceFingerprint,
    ipAddress,
    userAgent,
  });

  const jwtToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId,
    tokenVersion: user.tokenVersion || 0,
  });

  return [jwtToken, refreshTokenStr, refreshFamily];
}

function buildUserResponse(user: any, orgId: string) {
  return {
    id: user.id,
    userNumber: user.userNumber,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    permissions: user.permissions || [],
    orgId,
    emailVerified: user.emailVerified || false,
  };
}

function clearFailedAttempts(user: any): void {
  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();
  user.status = "online";
  saveUserChange(user);
}

async function saveUserChange(user: any): Promise<void> {
  if (user.password !== undefined) {
    await (User as any).updateOne({ id: user.id }, {
      $set: {
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        lastLogin: user.lastLogin,
        status: user.status,
      },
    });
  } else {
    await (ClientUser as any).updateOne({ id: user.id }, {
      $set: {
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        lastLogin: user.lastLogin,
        status: user.status,
      },
    });
  }
}

async function getPrimaryOrgId(userId: string): Promise<string | null> {
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

async function logAuditEvent(action: string, user: any, orgId: string, extra: any): Promise<void> {
  await recordAuditLog({
    orgId,
    userId: user.id,
    createdBy: user.id,
    action,
    entityType: "user",
    entityId: user.id,
    description: `${user.email} authenticated via ${extra.metadata?.authMethod || "unknown"}`,
    ipAddress: extra.ipAddress,
    userAgent: extra.userAgent,
    success: true,
    riskScore: extra.riskScore || 0,
    riskFactors: [],
    metadata: extra.metadata,
    tags: ["authentication"],
  });
}

function reqIp(): string {
  return "0.0.0.0";
}

export async function verifyRefreshTokenPipeline(
  refreshTokenStr: string,
  deviceFingerprint?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ token: string; refreshToken: string; sessionId: string }> {
  const { verifyRefreshToken } = await import("../config/auth.js");
  let payload: { userId: string; orgId: string; tokenVersion: number; family: string };

  try {
    payload = verifyRefreshToken(refreshTokenStr);
  } catch {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  const storedToken = await RefreshToken.findOne({
    token: crypto.createHash("sha256").update(refreshTokenStr).digest("hex"),
    revokedAt: { $exists: false },
  });

  if (!storedToken) {
    throw new AppError(401, "Refresh token has been revoked");
  }

  if (storedToken.family !== payload.family) {
    await RefreshToken.updateMany(
      { family: storedToken.family, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    const u = await User.findOne({ id: payload.userId });
    if (u) {
      u.tokenVersion = (u.tokenVersion || 0) + 1;
      await u.save();
    }
    throw new AppError(401, "Token family compromised. All tokens revoked.");
  }

  const user = await User.findOne({ id: payload.userId }).select(
    "id email name role permissions orgId tokenVersion isActive"
  );

  if (!user) throw new AppError(401, "User not found");
  if (!user.isActive) throw new AppError(403, "Account is deactivated");

  storedToken.revokedAt = new Date();
  await storedToken.save();

  const newRefreshFamily = uuid();
  const newRefreshTokenStr = signRefreshToken({
    userId: user.id,
    orgId: payload.orgId,
    tokenVersion: user.tokenVersion || 0,
    family: newRefreshFamily,
  });

  await RefreshToken.create({
    token: crypto.createHash("sha256").update(newRefreshTokenStr).digest("hex"),
    userId: user.id,
    orgId: payload.orgId,
    family: newRefreshFamily,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deviceFingerprint,
    ipAddress,
    userAgent,
  });

  const jwtToken = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId: payload.orgId,
    tokenVersion: user.tokenVersion || 0,
  });

  const existingSession = await Session.findOne({ userId: user.id, isActive: true })
    .sort({ lastActivityAt: -1 }).lean();

  return {
    token: jwtToken,
    refreshToken: newRefreshTokenStr,
    sessionId: existingSession?._id?.toString() || "",
  };
}

export async function checkOrgMfaPolicy(_userId: string, _orgId: string, _role: string): Promise<{ mfaRequired: boolean; inGracePeriod: boolean; gracePeriodEndsAt: Date | null }> {
  return { mfaRequired: false, inGracePeriod: false, gracePeriodEndsAt: null };
}
