import { logger } from "../logger/index.js";
import { AuditLog, IAuditLog } from "../db/models/AuditLog.js";

/**
 * SIEM (Security Information and Event Management) Integration
 * Provides structured JSON export and webhook delivery for security events.
 */

export interface SIEMEvent {
  timestamp: string;
  event_id: string;
  correlation_id: string;
  org_id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  description: string;
  success: boolean;
  failure_reason?: string;
  risk_score: number;
  risk_factors: string[];
  ip_address?: string;
  user_agent?: string;
  browser?: string;
  os?: string;
  device_fingerprint?: string;
  session_id?: string;
  trace_id?: string;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  source: string;
  severity: "info" | "warning" | "error" | "critical";
}

export interface SIEMConfig {
  webhookUrl?: string;
  webhookSecret?: string;
  batchSize: number;
  flushIntervalMs: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: SIEMConfig = {
  batchSize: 100,
  flushIntervalMs: 30000, // 30 seconds
  enabled: true,
};

let config: SIEMConfig = { ...DEFAULT_CONFIG };
let eventBuffer: SIEMEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Initialize SIEM integration.
 */
export function initSIEM(customConfig: Partial<SIEMConfig> = {}): void {
  config = { ...DEFAULT_CONFIG, ...customConfig };

  if (config.enabled && config.webhookUrl) {
    // Start flush timer
    flushTimer = setInterval(flushEvents, config.flushIntervalMs);
    logger.info({ webhookUrl: config.webhookUrl }, "SIEM integration initialized");
  }
}

/**
 * Shutdown SIEM integration.
 */
export function shutdownSIEM(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  // Flush remaining events
  flushEvents().catch(() => {});
}

/**
 * Convert risk score to severity level.
 */
function riskToSeverity(riskScore: number): SIEMEvent["severity"] {
  if (riskScore >= 70) return "critical";
  if (riskScore >= 40) return "error";
  if (riskScore >= 20) return "warning";
  return "info";
}

/**
 * Convert audit log entry to SIEM event format.
 */
export function auditLogToSIEM(entry: IAuditLog): SIEMEvent {
  return {
    timestamp: entry.createdAt.toISOString(),
    event_id: entry._id?.toString() || entry.hash,
    correlation_id: entry.correlationId,
    org_id: entry.orgId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    description: entry.description,
    success: entry.success,
    failure_reason: entry.failureReason,
    risk_score: entry.riskScore,
    risk_factors: entry.riskFactors || [],
    ip_address: entry.ipAddress,
    user_agent: entry.userAgent,
    browser: entry.browser,
    os: entry.os,
    device_fingerprint: entry.deviceFingerprint,
    session_id: entry.sessionId,
    trace_id: entry.traceId,
    previous_values: entry.previousValues,
    new_values: entry.newValues,
    metadata: entry.metadata as Record<string, any>,
    tags: entry.tags,
    source: "myworkspace",
    severity: riskToSeverity(entry.riskScore),
  };
}

/**
 * Send event to SIEM webhook.
 */
async function sendToWebhook(events: SIEMEvent[]): Promise<boolean> {
  if (!config.webhookUrl) return false;

  try {
    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.webhookSecret ? { "X-SIEM-Secret": config.webhookSecret } : {}),
      },
      body: JSON.stringify({
        events,
        batch_size: events.length,
        source: "myworkspace",
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      logger.error({ status: response.status }, "SIEM webhook delivery failed");
      return false;
    }

    return true;
  } catch (err: any) {
    logger.error({ err: err.message }, "SIEM webhook delivery failed");
    return false;
  }
}

/**
 * Buffer an event for batch delivery.
 */
export function bufferSIEMEvent(event: SIEMEvent): void {
  if (!config.enabled) return;

  eventBuffer.push(event);

  if (eventBuffer.length >= config.batchSize) {
    flushEvents().catch(() => {});
  }
}

/**
 * Flush buffered events to SIEM.
 */
async function flushEvents(): Promise<void> {
  if (eventBuffer.length === 0) return;

  const events = [...eventBuffer];
  eventBuffer = [];

  if (config.webhookUrl) {
    const success = await sendToWebhook(events);
    if (!success) {
      // Re-queue failed events (with limit to prevent memory issues)
      const maxRequeue = 1000;
      eventBuffer = [...events.slice(-maxRequeue), ...eventBuffer];
      logger.warn({ count: events.length }, "SIEM events re-queued due to delivery failure");
    }
  }

  // Always log to structured logger for SIEM collection
  for (const event of events) {
    logger.info({
      siem: true,
      ...event,
    }, `SIEM: ${event.action}`);
  }
}

/**
 * Process audit log entry for SIEM.
 */
export function processForSIEM(entry: IAuditLog): void {
  const siemEvent = auditLogToSIEM(entry);

  // Only send high-risk events to webhook immediately
  if (siemEvent.risk_score >= 40) {
    sendToWebhook([siemEvent]).catch(() => {});
  }

  // Buffer all events for batch delivery
  bufferSIEMEvent(siemEvent);
}

/**
 * Query audit logs for SIEM export.
 */
export async function queryAuditLogsForSIEM(
  orgId: string,
  startDate: Date,
  endDate: Date,
  limit = 1000,
): Promise<SIEMEvent[]> {
  const entries = await AuditLog.find({
    orgId,
    createdAt: { $gte: startDate, $lte: endDate },
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()
    .exec();

  return (entries as any[]).map(auditLogToSIEM);
}

/**
 * Get SIEM statistics.
 */
export function getSIEMStats(): {
  enabled: boolean;
  webhookConfigured: boolean;
  bufferedEvents: number;
  flushIntervalMs: number;
} {
  return {
    enabled: config.enabled,
    webhookConfigured: !!config.webhookUrl,
    bufferedEvents: eventBuffer.length,
    flushIntervalMs: config.flushIntervalMs,
  };
}
