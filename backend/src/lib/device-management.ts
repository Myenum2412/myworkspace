import { logger } from "./logger/index.js";
import { recordAuditLog } from "../services/audit.service.js";
import mongoose from "mongoose";

/**
 * Device Management Service
 * Tracks device fingerprints, trust scores, and manages device lifecycle.
 */

export interface DeviceFingerprint {
  userId: string;
  orgId: string;
  fingerprint: string;
  userAgent: string;
  ipAddress: string;
  browser?: string;
  os?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
  screenResolution?: string;
  timezone?: string;
  language?: string;
  isTrusted: boolean;
  trustScore: number; // 0-100
  lastSeenAt: Date;
  createdAt: Date;
  loginCount: number;
  suspiciousActivityCount: number;
}

export interface DeviceTrustResult {
  trusted: boolean;
  trustScore: number;
  requiresMfa: boolean;
  reason: string;
}

// In-memory device store (production should use MongoDB)
const deviceStore = new Map<string, DeviceFingerprint>();

const TRUST_THRESHOLDS = {
  TRUSTED: 70,
  MFA_REQUIRED: 40,
  SUSPICIOUS: 20,
};

const TRUST_SCORES = {
  NEW_DEVICE: 10,
  KNOWN_DEVICE: 50,
  TRUSTED_DEVICE: 80,
  LOGIN_SUCCESS: 5,
  LOGIN_FAILURE: -10,
  SUSPICIOUS_ACTIVITY: -20,
  TIME_SINCE_LAST_SEEN_DAYS: 30,
};

/**
 * Generate a device fingerprint from request headers.
 */
export function generateDeviceFingerprint(req: {
  headers: Record<string, string | undefined>;
  ip?: string;
}): string {
  const components = [
    req.headers["user-agent"] || "",
    req.headers["accept-language"] || "",
    req.headers["accept-encoding"] || "",
    req.ip || req.headers["x-forwarded-for"] || "",
  ];

  // Simple hash function
  let hash = 0;
  const content = components.join("|");
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Parse user agent string to extract browser and OS info.
 */
function parseUserAgent(userAgent: string): {
  browser?: string;
  os?: string;
  deviceType?: "desktop" | "mobile" | "tablet";
} {
  const ua = userAgent.toLowerCase();

  let browser: string | undefined;
  if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";

  let os: string | undefined;
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  let deviceType: "desktop" | "mobile" | "tablet" | undefined;
  if (ua.includes("mobile") || ua.includes("iphone") || ua.includes("android")) {
    deviceType = "mobile";
  } else if (ua.includes("ipad") || ua.includes("tablet")) {
    deviceType = "tablet";
  } else {
    deviceType = "desktop";
  }

  return { browser, os, deviceType };
}

/**
 * Record a device login attempt.
 */
export async function recordDeviceLogin(
  userId: string,
  orgId: string,
  fingerprint: string,
  req: {
    headers: Record<string, string | undefined>;
    ip?: string;
  },
  success: boolean,
): Promise<DeviceTrustResult> {
  const userAgent = req.headers["user-agent"] || "";
  const ipAddress = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const parsed = parseUserAgent(userAgent);

  const existing = deviceStore.get(`${userId}:${fingerprint}`);

  if (existing) {
    // Update existing device
    existing.loginCount++;
    existing.lastSeenAt = new Date();
    existing.ipAddress = ipAddress;
    existing.userAgent = userAgent;

    if (success) {
      existing.trustScore = Math.min(100, existing.trustScore + TRUST_SCORES.LOGIN_SUCCESS);
    } else {
      existing.trustScore = Math.max(0, existing.trustScore + TRUST_SCORES.LOGIN_FAILURE);
      existing.suspiciousActivityCount++;
    }

    // Check for suspicious patterns
    if (existing.suspiciousActivityCount > 3) {
      existing.trustScore = Math.max(0, existing.trustScore + TRUST_SCORES.SUSPICIOUS_ACTIVITY);
    }

    deviceStore.set(`${userId}:${fingerprint}`, existing);

    return evaluateTrust(existing);
  }

  // New device
  const newDevice: DeviceFingerprint = {
    userId,
    orgId,
    fingerprint,
    userAgent,
    ipAddress,
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
    isTrusted: false,
    trustScore: success ? TRUST_SCORES.KNOWN_DEVICE : TRUST_SCORES.NEW_DEVICE,
    lastSeenAt: new Date(),
    createdAt: new Date(),
    loginCount: 1,
    suspiciousActivityCount: success ? 0 : 1,
  };

  deviceStore.set(`${userId}:${fingerprint}`, newDevice);

  // Audit log for new device
  await recordAuditLog({
    orgId,
    userId,
    action: "device.new",
    entityType: "device",
    entityId: fingerprint,
    description: `New device login from ${parsed.browser} on ${parsed.os} (${parsed.deviceType})`,
    ipAddress,
    userAgent,
    success,
    metadata: JSON.stringify({
      browser: parsed.browser,
      os: parsed.os,
      deviceType: parsed.deviceType,
    }),
  });

  return evaluateTrust(newDevice);
}

/**
 * Evaluate device trust level.
 */
function evaluateTrust(device: DeviceFingerprint): DeviceTrustResult {
  const trustScore = device.trustScore;
  const trusted = trustScore >= TRUST_THRESHOLDS.TRUSTED;
  const requiresMfa = trustScore < TRUST_THRESHOLDS.MFA_REQUIRED;

  let reason: string;
  if (trusted) {
    reason = "Device is trusted based on login history";
  } else if (requiresMfa) {
    reason = "Device requires MFA due to low trust score";
  } else if (device.suspiciousActivityCount > 0) {
    reason = "Device has suspicious activity history";
  } else if (device.loginCount === 1) {
    reason = "New device, first login";
  } else {
    reason = "Device trust is being established";
  }

  return {
    trusted,
    trustScore,
    requiresMfa,
    reason,
  };
}

/**
 * Trust a device explicitly.
 */
export async function trustDevice(
  userId: string,
  fingerprint: string,
  performedBy: string,
): Promise<boolean> {
  const key = `${userId}:${fingerprint}`;
  const device = deviceStore.get(key);

  if (!device) {
    return false;
  }

  device.isTrusted = true;
  device.trustScore = Math.max(device.trustScore, TRUST_SCORES.TRUSTED_DEVICE);
  deviceStore.set(key, device);

  await recordAuditLog({
    orgId: device.orgId,
    userId: performedBy,
    action: "device.trusted",
    entityType: "device",
    entityId: fingerprint,
    description: `Device trusted by user ${performedBy}`,
    metadata: JSON.stringify({
      browser: device.browser,
      os: device.os,
      deviceType: device.deviceType,
    }),
  });

  return true;
}

/**
 * Revoke trust for a device.
 */
export async function revokeDevice(
  userId: string,
  fingerprint: string,
  performedBy: string,
): Promise<boolean> {
  const key = `${userId}:${fingerprint}`;
  const device = deviceStore.get(key);

  if (!device) {
    return false;
  }

  device.isTrusted = false;
  device.trustScore = 0;
  deviceStore.set(key, device);

  await recordAuditLog({
    orgId: device.orgId,
    userId: performedBy,
    action: "device.revoked",
    entityType: "device",
    entityId: fingerprint,
    description: `Device trust revoked by user ${performedBy}`,
    metadata: JSON.stringify({
      browser: device.browser,
      os: device.os,
      deviceType: device.deviceType,
    }),
  });

  return true;
}

/**
 * Get all devices for a user.
 */
export function getUserDevices(userId: string): DeviceFingerprint[] {
  const devices: DeviceFingerprint[] = [];
  for (const [key, device] of deviceStore.entries()) {
    if (key.startsWith(`${userId}:`)) {
      devices.push(device);
    }
  }
  return devices.sort((a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime());
}

/**
 * Get device by fingerprint.
 */
export function getDevice(userId: string, fingerprint: string): DeviceFingerprint | undefined {
  return deviceStore.get(`${userId}:${fingerprint}`);
}

/**
 * Remove a device.
 */
export async function removeDevice(
  userId: string,
  fingerprint: string,
  performedBy: string,
): Promise<boolean> {
  const key = `${userId}:${fingerprint}`;
  const device = deviceStore.get(key);

  if (!device) {
    return false;
  }

  deviceStore.delete(key);

  await recordAuditLog({
    orgId: device.orgId,
    userId: performedBy,
    action: "device.removed",
    entityType: "device",
    entityId: fingerprint,
    description: `Device removed by user ${performedBy}`,
  });

  return true;
}

/**
 * Clean up old devices (older than specified days).
 */
export function cleanupOldDevices(maxAgeDays = 90): number {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
  let removed = 0;

  for (const [key, device] of deviceStore.entries()) {
    if (device.lastSeenAt < cutoff && !device.isTrusted) {
      deviceStore.delete(key);
      removed++;
    }
  }

  if (removed > 0) {
    logger.info({ removed, maxAgeDays }, "Cleaned up old devices");
  }

  return removed;
}
