import { AuditLog, calculateAuditHash, IAuditLog } from "../lib/db/models/AuditLog.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { eventProducer } from "../lib/queue/producer.js";
import { logger } from "../lib/logger/index.js";
import { env } from "../config/env.js";
import crypto from "crypto";

/**
 * Enhanced Audit Service with immutable hash chain logging.
 * Provides tamper-evident audit trail for compliance (SOC 2, ISO 27001, GDPR).
 */

export interface AuditEntry {
  // Core fields
  orgId: string;
  userId: string;
  createdBy?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;

  // Request context
  correlationId?: string;
  traceId?: string;
  sessionId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  browser?: string;
  os?: string;

  // Change tracking
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;

  // Risk assessment
  riskScore?: number;
  riskFactors?: string[];

  // Result
  success?: boolean;
  failureReason?: string;

  // Metadata
  metadata?: string | Record<string, any>;
  tags?: string[];
}

// Cache for last hash per org (in-memory, production should use Redis)
const lastHashCache = new Map<string, string>();

const AUDIT_LOG_ENABLED = true;
const HASH_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the last hash for an org from cache or database.
 */
async function getLastHash(orgId: string): Promise<string> {
  const cached = lastHashCache.get(orgId);
  if (cached) return cached;

  const lastEntry = await AuditLog.findOne({ orgId })
    .sort({ createdAt: -1 })
    .select("hash")
    .lean()
    .exec();

  const hash = lastEntry?.hash || "0";
  lastHashCache.set(orgId, hash);

  // Clear stale cache entries
  setTimeout(() => {
    lastHashCache.delete(orgId);
  }, HASH_CACHE_TTL);

  return hash;
}

/**
 * Calculate risk score based on action and context.
 */
function calculateRiskScore(entry: AuditEntry): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // High-risk actions
  const highRiskActions = [
    "password.reset", "password.changed", "role.changed",
    "permission.granted", "permission.revoked", "user.deleted",
    "org.deleted", "billing.changed", "security.bypass",
  ];

  const mediumRiskActions = [
    "login.failed", "logout", "session.terminated",
    "data.exported", "file.deleted", "settings.changed",
  ];

  if (highRiskActions.some(a => entry.action.includes(a))) {
    score += 40;
    factors.push("high_risk_action");
  } else if (mediumRiskActions.some(a => entry.action.includes(a))) {
    score += 20;
    factors.push("medium_risk_action");
  }

  // Failed operations
  if (entry.success === false) {
    score += 15;
    factors.push("operation_failed");
  }

  // Multiple failures (would need cross-request tracking in production)
  if (entry.failureReason?.includes("rate_limit")) {
    score += 25;
    factors.push("rate_limited");
  }

  // Admin actions
  if (entry.action.includes("admin") || entry.action.includes("platform")) {
    score += 10;
    factors.push("admin_action");
  }

  // Privilege escalation attempts
  if (entry.action.includes("escalation") || entry.action.includes("unauthorized")) {
    score += 30;
    factors.push("privilege_escalation");
  }

  return { score: Math.min(100, score), factors };
}

/**
 * Parse user agent string for device info.
 */
function parseUserAgent(userAgent?: string): { browser?: string; os?: string } {
  if (!userAgent) return {};

  const ua = userAgent.toLowerCase();
  let browser: string | undefined;
  let os: string | undefined;

  if (ua.includes("chrome")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari")) browser = "Safari";
  else if (ua.includes("edge")) browser = "Edge";

  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";
  else if (ua.includes("android")) os = "Android";
  else if (ua.includes("iphone") || ua.includes("ipad")) os = "iOS";

  return { browser, os };
}

/**
 * Write audit entry directly to database with hash chain.
 */
async function writeDirect(entry: AuditEntry): Promise<void> {
  try {
    const correlationId = entry.correlationId || crypto.randomUUID();
    const previousHash = await getLastHash(entry.orgId);
    const createdAt = new Date();

    // Parse metadata if it's a string
    const metadata = typeof entry.metadata === "string"
      ? JSON.parse(entry.metadata)
      : entry.metadata;

    // Calculate risk score
    const { score: riskScore, factors: riskFactors } = calculateRiskScore(entry);

    // Parse user agent
    const { browser, os } = parseUserAgent(entry.userAgent);

    // Build the entry for hashing
    const hashInput = {
      orgId: entry.orgId,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      description: entry.description,
      correlationId,
      success: entry.success !== false,
      createdAt,
    };

    const hash = calculateAuditHash(hashInput as any, previousHash);

    // Create immutable audit log entry
    await AuditLog.create({
      orgId: entry.orgId,
      userId: entry.userId,
      createdBy: entry.createdBy,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      description: entry.description,
      correlationId,
      traceId: entry.traceId,
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      deviceFingerprint: entry.deviceFingerprint,
      browser,
      os,
      previousValues: entry.previousValues,
      newValues: entry.newValues,
      riskScore,
      riskFactors,
      success: entry.success !== false,
      failureReason: entry.failureReason,
      hash,
      previousHash,
      metadata,
      tags: entry.tags,
      createdAt,
    });

    // Update cache
    lastHashCache.set(entry.orgId, hash);

    // Also write to legacy ActivityLog for backward compatibility
    await ActivityLog.create({
      orgId: entry.orgId,
      userId: entry.userId,
      createdBy: entry.createdBy,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      description: entry.description,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success,
      metadata: typeof entry.metadata === "string" ? entry.metadata : JSON.stringify(entry.metadata),
    });
  } catch (err) {
    logger.error({ err, entry }, "Direct audit log write failed");
  }
}

/**
 * Write audit entry via message queue.
 */
async function writeViaQueue(entry: AuditEntry): Promise<void> {
  try {
    const { QUEUES, getChannel } = await import("../lib/queue/connection.js");
    const ch = await getChannel();
    if (ch) {
      ch.sendToQueue(
        QUEUES.AUDIT_LOG,
        Buffer.from(JSON.stringify(entry)),
        { persistent: true, priority: 5 },
      );
      return;
    }
  } catch {
    // Queue unavailable, fall through to direct write
  }
  await writeDirect(entry);
}

/**
 * Record an audit log entry.
 * Main entry point for audit logging.
 */
export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  if (!AUDIT_LOG_ENABLED) return;

  try {
    await writeViaQueue(entry);
  } catch (err) {
    logger.error({ err, entry }, "Audit log recording failed after all attempts");
  }
}

/**
 * Record audit log directly (bypass queue).
 * Use for critical security events.
 */
export async function recordAuditLogDirect(entry: AuditEntry): Promise<void> {
  if (!AUDIT_LOG_ENABLED) return;
  await writeDirect(entry);
}

/**
 * Verify the integrity of an audit log chain for an org.
 */
export async function verifyAuditChain(
  orgId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  valid: boolean;
  totalEntries: number;
  brokenEntries: number;
  firstBrokenIndex?: number;
}> {
  const entries = await AuditLog.find({
    orgId,
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .sort({ createdAt: 1 })
    .lean()
    .exec();

  let valid = true;
  let brokenEntries = 0;
  let firstBrokenIndex: number | undefined;
  let previousHash = "0";

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Verify hash chain
    const expectedHash = calculateAuditHash(
      {
        orgId: entry.orgId,
        userId: entry.userId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        description: entry.description,
        correlationId: entry.correlationId,
        success: entry.success,
        createdAt: entry.createdAt,
      } as any,
      previousHash,
    );

    if (entry.hash !== expectedHash || entry.previousHash !== previousHash) {
      valid = false;
      brokenEntries++;
      if (firstBrokenIndex === undefined) {
        firstBrokenIndex = i;
      }
    }

    previousHash = entry.hash;
  }

  return {
    valid,
    totalEntries: entries.length,
    brokenEntries,
    firstBrokenIndex,
  };
}

/**
 * Get audit statistics for an org.
 */
export async function getAuditStats(
  orgId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<{
  totalEntries: number;
  successfulActions: number;
  failedActions: number;
  highRiskEvents: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
}> {
  const matchFilter: Record<string, any> = { orgId };
  if (startDate || endDate) {
    matchFilter.createdAt = {};
    if (startDate) matchFilter.createdAt.$gte = startDate;
    if (endDate) matchFilter.createdAt.$lte = endDate;
  }

  const [stats] = await AuditLog.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: null,
        totalEntries: { $sum: 1 },
        successfulActions: { $sum: { $cond: ["$success", 1, 0] } },
        failedActions: { $sum: { $cond: ["$success", 0, 1] } },
        highRiskEvents: { $sum: { $cond: [{ $gte: ["$riskScore", 40] }, 1, 0] } },
        uniqueUsers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        totalEntries: 1,
        successfulActions: 1,
        failedActions: 1,
        highRiskEvents: 1,
        uniqueUsers: { $size: "$uniqueUsers" },
      },
    },
  ]).exec();

  const topActions = await AuditLog.aggregate([
    { $match: matchFilter },
    { $group: { _id: "$action", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, action: "$_id", count: 1 } },
  ]).exec();

  return {
    totalEntries: stats?.totalEntries || 0,
    successfulActions: stats?.successfulActions || 0,
    failedActions: stats?.failedActions || 0,
    highRiskEvents: stats?.highRiskEvents || 0,
    uniqueUsers: stats?.uniqueUsers || 0,
    topActions,
  };
}
