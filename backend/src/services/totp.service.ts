import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";
import { hash, compare } from "bcryptjs";
import { User, IUser } from "../lib/db/models/User.js";
import { Session } from "../lib/db/models/Session.js";
import { RefreshToken } from "../lib/db/models/RefreshToken.js";
import { RecoveryCode } from "../lib/db/models/RecoveryCode.js";
import { TrustedDevice } from "../lib/db/models/TrustedDevice.js";
import { MfaSession } from "../lib/db/models/MfaSession.js";
import { encryptTOTPSecret, decryptTOTPSecret } from "../lib/security/totp-encryption.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";

const ISSUER = "MyWorkSpace";
const RECOVERY_CODES_COUNT = 10;
const RECOVERY_CODE_LENGTH = 10;
const TRUSTED_DEVICE_TTL_DAYS = 30;

export type MfaStatus = {
  enabled: boolean;
  method: string;
  pendingVerification: boolean;
  enabledAt: string | null;
  lastVerifiedAt: string | null;
  backupCodesGeneratedAt: string | null;
};

export interface AuditContext {
  orgId: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  sessionId?: string;
}

function generateTOTPInstance(secretBase32: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: "MyWorkSpace",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

function generateSecret(): { base32: string; otpauthUrl: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  const base32 = secret.base32;
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: "MyWorkSpace",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret,
  });
  return { base32, otpauthUrl: totp.toString() };
}

function validateTOTPToken(secretBase32: string, token: string): boolean {
  const totp = generateTOTPInstance(secretBase32);
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export async function getMfaStatus(userId: string): Promise<MfaStatus> {
  const user = await User.findOne({ id: userId }).select(
    "twoFactorEnabled twoFactorMethod twoFactorPendingSecret twoFactorEnabledAt twoFactorLastVerifiedAt backupCodesGeneratedAt"
  ).lean();
  if (!user) throw new AppError(404, "User not found");

  return {
    enabled: user.twoFactorEnabled,
    method: user.twoFactorMethod || "none",
    pendingVerification: !!user.twoFactorPendingSecret && !user.twoFactorEnabled,
    enabledAt: user.twoFactorEnabledAt?.toISOString() || null,
    lastVerifiedAt: user.twoFactorLastVerifiedAt?.toISOString() || null,
    backupCodesGeneratedAt: user.backupCodesGeneratedAt?.toISOString() || null,
  };
}

export async function setupTOTP(userId: string, email: string, audit: AuditContext): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
  const user = await User.findOne({ id: userId }).select("id twoFactorEnabled twoFactorPendingSecret email orgId");
  if (!user) throw new AppError(404, "User not found");
  if (user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is already enabled");

  const { base32, otpauthUrl } = generateSecret();

  const encryptedSecret = encryptTOTPSecret(base32);
  user.twoFactorPendingSecret = encryptedSecret;
  await user.save();

  await recordAuditLog({
    orgId: audit.orgId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.setup_started",
    entityType: "user",
    entityId: user.id,
    description: `TOTP setup initiated for ${email}`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return {
    secret: base32,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

export async function verifyAndEnableTOTP(
  userId: string,
  token: string,
  audit: AuditContext,
): Promise<{ recoveryCodes: string[] }> {
  const user = await User.findOne({ id: userId }).select(
    "id twoFactorEnabled twoFactorPendingSecret twoFactorSecret email twoFactorMethod orgId"
  );
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorPendingSecret) throw new AppError(400, "TOTP not set up. Run setup first.");
  if (user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is already enabled");

  const decryptedPendingSecret = decryptTOTPSecret(user.twoFactorPendingSecret);

  if (!validateTOTPToken(decryptedPendingSecret, token)) {
    await recordAuditLog({
      orgId: audit.orgId,
      userId: user.id,
      createdBy: user.id,
      action: "twoFactor.verification_failure",
      entityType: "user",
      entityId: user.id,
      description: `TOTP verification failed during setup for ${user.email}`,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      correlationId: audit.correlationId,
      success: false,
      failureReason: "Invalid token during setup verification",
    });
    throw new AppError(400, "Invalid verification code. Please try again.");
  }

  const encryptedSecret = encryptTOTPSecret(decryptedPendingSecret);
  user.twoFactorSecret = encryptedSecret;
  user.twoFactorPendingSecret = undefined;
  user.twoFactorEnabled = true;
  user.twoFactorMethod = "totp";
  user.twoFactorEnabledAt = new Date();
  user.twoFactorLastVerifiedAt = new Date();

  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(
    recoveryCodes.map((code) => hash(code, 10))
  );

  await RecoveryCode.deleteMany({ userId: user.id });
  await RecoveryCode.insertMany(
    hashedCodes.map((codeHash) => ({
      userId: user.id,
      codeHash,
      used: false,
      createdAt: new Date(),
    }))
  );

  user.backupCodesGeneratedAt = new Date();
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  await Session.updateMany(
    { userId: user.id, logoutTime: { $exists: false } },
    {
      $set: { logoutTime: new Date(), currentStatus: "offline" },
      $push: { statusTransitions: { status: "offline", timestamp: new Date() } },
    },
  );

  await RefreshToken.deleteMany({ userId: user.id });
  await MfaSession.deleteMany({ userId: user.id });

  await recordAuditLog({
    orgId: audit.orgId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.enabled",
    entityType: "user",
    entityId: user.id,
    description: `${user.email} enabled TOTP two-factor authentication`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
    success: true,
    metadata: { tokenVersion: user.tokenVersion },
  });

  return { recoveryCodes };
}

export async function verifyTOTP(
  userId: string,
  token: string,
  audit: AuditContext,
): Promise<boolean> {
  const user = await User.findOne({ id: userId }).select(
    "id twoFactorEnabled twoFactorSecret twoFactorLastVerifiedAt email orgId"
  );
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is not enabled");
  if (!user.twoFactorSecret) throw new AppError(400, "TOTP not configured");

  const decryptedSecret = decryptTOTPSecret(user.twoFactorSecret);

  if (!validateTOTPToken(decryptedSecret, token)) {
    await recordAuditLog({
      orgId: audit.orgId,
      userId: user.id,
      createdBy: user.id,
      action: "twoFactor.verification_failure",
      entityType: "user",
      entityId: user.id,
      description: `TOTP verification failed for ${user.email}`,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      correlationId: audit.correlationId,
      success: false,
      failureReason: "Invalid TOTP token",
    });
    return false;
  }

  user.twoFactorLastVerifiedAt = new Date();
  await user.save();

  await recordAuditLog({
    orgId: audit.orgId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.verification_success",
    entityType: "user",
    entityId: user.id,
    description: `TOTP verification succeeded for ${user.email}`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
    success: true,
  });

  return true;
}

export async function verifyRecoveryCode(
  userId: string,
  code: string,
  audit: AuditContext,
): Promise<boolean> {
  const recoveryCodes = await RecoveryCode.find({ userId, used: false }).lean();
  if (recoveryCodes.length === 0) {
    throw new AppError(400, "No recovery codes available. Generate new ones.");
  }

  for (const rc of recoveryCodes) {
    const valid = await compare(code, rc.codeHash);
    if (valid) {
      await RecoveryCode.updateOne(
        { _id: rc._id },
        { $set: { used: true, usedAt: new Date() } }
      );

      const user = await User.findOne({ id: userId }).select("id email twoFactorLastVerifiedAt orgId");
      if (user) {
        user.twoFactorLastVerifiedAt = new Date();
        await user.save();
      }

      await recordAuditLog({
        orgId: audit.orgId,
        userId,
        createdBy: userId,
        action: "twoFactor.recovery_code_used",
        entityType: "user",
        entityId: userId,
        description: `Recovery code used by user`,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        correlationId: audit.correlationId,
        success: true,
        riskScore: 40,
        riskFactors: ["recovery_code_used"],
      });

      return true;
    }
  }

  await recordAuditLog({
    orgId: audit.orgId,
    userId,
    createdBy: userId,
    action: "twoFactor.recovery_code_failure",
    entityType: "user",
    entityId: userId,
    description: `Invalid recovery code attempt`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
    success: false,
    failureReason: "Invalid recovery code",
    riskScore: 30,
    riskFactors: ["invalid_recovery_code"],
  });

  return false;
}

export async function disableTOTP(
  userId: string,
  audit: AuditContext,
): Promise<void> {
  const user = await User.findOne({ id: userId }).select(
    "id twoFactorEnabled twoFactorSecret twoFactorMethod email orgId"
  );
  if (!user) throw new AppError(404, "User not found");
  if (!user.twoFactorEnabled) throw new AppError(400, "Two-factor authentication is not enabled");

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorPendingSecret = undefined;
  user.twoFactorMethod = "none";
  user.twoFactorEnabledAt = undefined;
  user.twoFactorLastVerifiedAt = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  await RecoveryCode.deleteMany({ userId: user.id });
  await TrustedDevice.deleteMany({ userId: user.id });
  await MfaSession.deleteMany({ userId: user.id });

  await Session.updateMany(
    { userId: user.id, logoutTime: { $exists: false } },
    {
      $set: { logoutTime: new Date(), currentStatus: "offline" },
      $push: { statusTransitions: { status: "offline", timestamp: new Date() } },
    },
  );

  await RefreshToken.deleteMany({ userId: user.id });

  await recordAuditLog({
    orgId: audit.orgId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.disabled",
    entityType: "user",
    entityId: user.id,
    description: `${user.email} disabled two-factor authentication`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
    success: true,
    riskScore: 40,
    riskFactors: ["mfa_disabled"],
  });
}

export async function generateRecoveryCodesForUser(
  userId: string,
  audit: AuditContext,
): Promise<string[]> {
  const user = await User.findOne({ id: userId }).select("id email orgId");
  if (!user) throw new AppError(404, "User not found");

  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = await Promise.all(
    recoveryCodes.map((code) => hash(code, 10))
  );

  await RecoveryCode.deleteMany({ userId: user.id });
  await RecoveryCode.insertMany(
    hashedCodes.map((codeHash) => ({
      userId: user.id,
      codeHash,
      used: false,
      createdAt: new Date(),
    }))
  );

  user.backupCodesGeneratedAt = new Date();
  await user.save();

  await recordAuditLog({
    orgId: audit.orgId,
    userId: user.id,
    createdBy: user.id,
    action: "twoFactor.recovery_codes_generated",
    entityType: "user",
    entityId: user.id,
    description: `New recovery codes generated for ${user.email}`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
    success: true,
  });

  return recoveryCodes;
}

export async function getRecoveryCodesStatus(userId: string): Promise<{
  total: number;
  used: number;
  remaining: number;
  generatedAt: string | null;
}> {
  const user = await User.findOne({ id: userId }).select("backupCodesGeneratedAt").lean();

  const [total, used] = await Promise.all([
    RecoveryCode.countDocuments({ userId }),
    RecoveryCode.countDocuments({ userId, used: true }),
  ]);

  return {
    total,
    used,
    remaining: total - used,
    generatedAt: user?.backupCodesGeneratedAt?.toISOString() || null,
  };
}

export async function trustDevice(
  userId: string,
  deviceFingerprint: string,
  deviceName: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await TrustedDevice.findOneAndUpdate(
    { userId, deviceFingerprint },
    {
      userId,
      deviceFingerprint,
      deviceName,
      ipAddress,
      userAgent,
      expiresAt,
      lastUsedAt: new Date(),
    },
    { upsert: true, new: true },
  );
}

export async function removeTrustedDevice(deviceId: string, userId: string): Promise<void> {
  const device = await TrustedDevice.findOneAndDelete({ _id: deviceId, userId });
  if (!device) throw new AppError(404, "Trusted device not found");
}

export async function isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean> {
  const device = await TrustedDevice.findOne({
    userId,
    deviceFingerprint,
    expiresAt: { $gt: new Date() },
  }).lean();
  return !!device;
}

export async function getTrustedDevices(userId: string): Promise<any[]> {
  const devices = await TrustedDevice.find({ userId })
    .sort({ lastUsedAt: -1 })
    .lean();
  return devices.map((d) => ({
    id: d._id.toString(),
    deviceName: d.deviceName,
    deviceFingerprint: d.deviceFingerprint,
    ipAddress: d.ipAddress,
    userAgent: d.userAgent,
    expiresAt: d.expiresAt,
    lastUsedAt: d.lastUsedAt,
    createdAt: d.createdAt,
  }));
}

export async function adminResetMFA(
  targetUserId: string,
  adminUserId: string,
  audit: AuditContext,
): Promise<void> {
  const user = await User.findOne({ id: targetUserId }).select(
    "id twoFactorEnabled twoFactorSecret twoFactorPendingSecret twoFactorMethod email orgId name"
  );
  if (!user) throw new AppError(404, "User not found");

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  user.twoFactorPendingSecret = undefined;
  user.twoFactorMethod = "none";
  user.twoFactorEnabledAt = undefined;
  user.twoFactorLastVerifiedAt = undefined;
  user.backupCodesGeneratedAt = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  await RecoveryCode.deleteMany({ userId: user.id });
  await TrustedDevice.deleteMany({ userId: user.id });
  await MfaSession.deleteMany({ userId: user.id });

  await Session.updateMany(
    { userId: user.id, logoutTime: { $exists: false } },
    {
      $set: { logoutTime: new Date(), currentStatus: "offline" },
      $push: { statusTransitions: { status: "offline", timestamp: new Date() } },
    },
  );

  await RefreshToken.deleteMany({ userId: user.id });

  await recordAuditLog({
    orgId: audit.orgId,
    userId: targetUserId,
    createdBy: adminUserId,
    action: "twoFactor.admin_reset",
    entityType: "user",
    entityId: targetUserId,
    description: `Admin ${adminUserId} reset MFA for ${user.email}`,
    ipAddress: audit.ipAddress,
    userAgent: audit.userAgent,
    correlationId: audit.correlationId,
    success: true,
    riskScore: 50,
    riskFactors: ["admin_action", "mfa_reset"],
    metadata: {
      performedBy: adminUserId,
      targetUser: targetUserId,
    },
  });
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < RECOVERY_CODES_COUNT; i++) {
    const code = crypto.randomBytes(RECOVERY_CODE_LENGTH).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 5)}-${code.slice(5, 10)}-${code.slice(10, 15)}-${code.slice(15, 20)}`;
    codes.push(formatted);
  }
  return codes;
}
