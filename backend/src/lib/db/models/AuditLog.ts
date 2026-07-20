import { Schema, model, Document } from "mongoose";
import crypto from "crypto";

/**
 * Immutable Audit Log with hash chain for tamper-evident logging.
 * Each entry includes a hash of the previous entry, creating a chain
 * that detects any modification or deletion of audit records.
 */

export interface IAuditLog extends Document {
  // Core fields
  orgId: string;
  userId: string;
  createdBy?: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;

  // Request context
  correlationId: string;
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
  riskScore: number;
  riskFactors: string[];

  // Result
  success: boolean;
  failureReason?: string;

  // Integrity
  hash: string;
  previousHash: string;

  // Metadata
  metadata?: Record<string, any>;
  tags?: string[];

  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  // Core fields
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  createdBy: { type: String },
  action: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  entityId: { type: String, index: true },
  description: { type: String, required: true },

  // Request context
  correlationId: { type: String, required: true, index: true },
  traceId: { type: String },
  sessionId: { type: String, index: true },
  requestId: { type: String },
  ipAddress: { type: String, index: true },
  userAgent: { type: String },
  deviceFingerprint: { type: String },
  browser: { type: String },
  os: { type: String },

  // Change tracking
  previousValues: { type: Schema.Types.Mixed },
  newValues: { type: Schema.Types.Mixed },

  // Risk assessment
  riskScore: { type: Number, default: 0, index: true },
  riskFactors: { type: [String], default: [] },

  // Result
  success: { type: Boolean, required: true, index: true },
  failureReason: { type: String },

  // Integrity
  hash: { type: String, required: true, index: true },
  previousHash: { type: String, required: true },

  // Metadata
  metadata: { type: Schema.Types.Mixed },
  tags: { type: [String], index: true },

  createdAt: { type: Date, default: Date.now, index: true },
}, {
  timestamps: false,
  // Prevent modification of audit logs
  strict: true,
});

// Compound indexes for common queries
auditLogSchema.index({ orgId: 1, createdAt: -1 });
auditLogSchema.index({ orgId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ orgId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ orgId: 1, entityType: 1, entityId: 1 });
auditLogSchema.index({ correlationId: 1 });
auditLogSchema.index({ riskScore: -1, createdAt: -1 });

// Prevent updates to audit logs (immutable)
auditLogSchema.pre("findOneAndUpdate", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditLogSchema.pre("updateOne", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

auditLogSchema.pre("updateMany", function () {
  throw new Error("Audit logs are immutable and cannot be updated");
});

// Prevent deletions of audit logs
auditLogSchema.pre("deleteOne", function () {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

auditLogSchema.pre("deleteMany", function () {
  throw new Error("Audit logs are immutable and cannot be deleted");
});

/**
 * Calculate hash for an audit log entry.
 */
export function calculateAuditHash(
  entry: Omit<IAuditLog, "hash" | "previousHash">,
  previousHash: string,
): string {
  const content = JSON.stringify({
    orgId: entry.orgId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    description: entry.description,
    correlationId: entry.correlationId,
    success: entry.success,
    createdAt: entry.createdAt?.toISOString() || new Date().toISOString(),
    previousHash,
  });

  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Verify the integrity of an audit log entry.
 */
export function verifyAuditIntegrity(
  entry: IAuditLog,
  previousHash: string,
): boolean {
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

  return entry.hash === expectedHash;
}

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
