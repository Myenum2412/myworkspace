import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { eventProducer } from "../lib/queue/producer.js";
import { logger } from "../lib/logger/index.js";
import { env } from "../config/env.js";

export interface AuditEntry {
  orgId: string;
  userId: string;
  createdBy: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: string;
}

const AUDIT_LOG_ENABLED = true;

async function writeDirect(entry: AuditEntry): Promise<void> {
  try {
    await ActivityLog.create(entry);
  } catch (err) {
    logger.error({ err, entry }, "Direct audit log write failed");
  }
}

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

export async function recordAuditLog(entry: AuditEntry): Promise<void> {
  if (!AUDIT_LOG_ENABLED) return;

  try {
    await writeViaQueue(entry);
  } catch (err) {
    logger.error({ err, entry }, "Audit log recording failed after all attempts");
  }
}

export async function recordAuditLogDirect(entry: AuditEntry): Promise<void> {
  if (!AUDIT_LOG_ENABLED) return;
  await writeDirect(entry);
}
