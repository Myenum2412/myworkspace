import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { Organization } from "../db/models/Organization.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { FileMetadata } from "../db/models/FileMetadata.js";
import { Project } from "../db/models/Project.js";
import { Task } from "../db/models/Task.js";
import { ActivityLog } from "../db/models/ActivityLog.js";

export type HoldScope = "org" | "project" | "user" | "file" | "legal_case";

export interface ILegalHold extends Document {
  id: string;
  orgId: string;
  name: string;
  caseNumber?: string;
  scope: HoldScope;
  scopeIds: string[];
  custodians: string[];
  reason: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRetentionSchedule extends Document {
  id: string;
  orgId: string;
  name: string;
  entityType: "file" | "task" | "project" | "activity" | "audit";
  retentionDays: number;
  action: "delete" | "archive" | "export" | "anonymize";
  conditions: Record<string, unknown>;
  isActive: boolean;
  lastRunAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface IPreservationRecord extends Document {
  id: string;
  orgId: string;
  holdId: string;
  entityType: string;
  entityId: string;
  preservedAt: Date;
  snapshot: Record<string, unknown>;
}

const legalHoldSchema = new Schema<ILegalHold>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  caseNumber: String,
  scope: { type: String, enum: ["org", "project", "user", "file", "legal_case"], required: true },
  scopeIds: [{ type: String }],
  custodians: [{ type: String }],
  reason: { type: String, required: true },
  issuedBy: { type: String, required: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  releasedAt: Date,
}, { timestamps: true });

legalHoldSchema.index({ orgId: 1, isActive: 1 });
legalHoldSchema.index({ custodians: 1 });

const retentionScheduleSchema = new Schema<IRetentionSchedule>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  entityType: { type: String, enum: ["file", "task", "project", "activity", "audit"], required: true },
  retentionDays: { type: Number, required: true },
  action: { type: String, enum: ["delete", "archive", "export", "anonymize"], required: true },
  conditions: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  lastRunAt: Date,
  createdBy: String,
}, { timestamps: true });

const preservationRecordSchema = new Schema<IPreservationRecord>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  holdId: { type: String, required: true, index: true },
  entityType: { type: String, required: true },
  entityId: { type: String, required: true },
  preservedAt: { type: Date, default: Date.now },
  snapshot: { type: Schema.Types.Mixed, required: true },
});

export const LegalHold = model<ILegalHold>("LegalHold", legalHoldSchema);
export const RetentionSchedule = model<IRetentionSchedule>("RetentionSchedule", retentionScheduleSchema);
export const PreservationRecord = model<IPreservationRecord>("PreservationRecord", preservationRecordSchema);

export class RetentionGovernance {
  async createLegalHold(params: {
    orgId: string; name: string; scope: HoldScope;
    scopeIds?: string[]; custodians?: string[];
    reason: string; issuedBy: string; caseNumber?: string;
    expiresAt?: Date;
  }): Promise<ILegalHold> {
    return LegalHold.create({
      id: uuid(), ...params,
      scopeIds: params.scopeIds || [],
      custodians: params.custodians || [],
    });
  }

  async releaseLegalHold(holdId: string): Promise<void> {
    await LegalHold.updateOne(
      { id: holdId },
      { $set: { isActive: false, releasedAt: new Date() } },
    );
    logger.info({ holdId }, "Legal hold released");
  }

  async checkEntityOnHold(orgId: string, entityType: string, entityId: string): Promise<boolean> {
    const holds = await LegalHold.find({ orgId, isActive: true }).lean();
    for (const hold of holds) {
      if (hold.scope === "org") return true;
      if (hold.scope === "file" && hold.scopeIds.includes(entityId)) return true;
    }
    return false;
  }

  async preserveForHold(
    orgId: string,
    holdId: string,
    entityType: string,
    entityId: string,
  ): Promise<IPreservationRecord> {
    let snapshot: Record<string, unknown> = {};

    switch (entityType) {
      case "file": {
        const file = await FileAttachment.findOne({ id: entityId }).lean();
        if (file) snapshot = file as any;
        break;
      }
      case "task": {
        const task = await Task.findOne({ id: entityId }).lean();
        if (task) snapshot = task as any;
        break;
      }
      case "project": {
        const project = await Project.findOne({ id: entityId }).lean();
        if (project) snapshot = project as any;
        break;
      }
    }

    return PreservationRecord.create({
      id: uuid(), orgId, holdId, entityType, entityId,
      preservedAt: new Date(),
      snapshot,
    });
  }

  async createRetentionSchedule(params: {
    orgId: string; name: string; entityType: IRetentionSchedule["entityType"];
    retentionDays: number; action: IRetentionSchedule["action"];
    conditions?: Record<string, unknown>; createdBy: string;
  }): Promise<IRetentionSchedule> {
    return RetentionSchedule.create({
      id: uuid(), ...params,
      conditions: params.conditions || {},
      isActive: true,
    });
  }

  async executeRetentionPolicies(orgId: string): Promise<{
    deleted: number; archived: number; errors: number;
  }> {
    const schedules = await RetentionSchedule.find({ orgId, isActive: true }).lean();
    let deleted = 0, archived = 0, errors = 0;

    for (const schedule of schedules) {
      try {
        const cutoff = new Date(Date.now() - schedule.retentionDays * 86400000);

        switch (schedule.entityType) {
          case "file": {
            const onHold = await this.getHeldEntityIds(orgId, "file");
            const filter: Record<string, unknown> = {
              orgId,
              createdAt: { $lt: cutoff },
              id: { $nin: onHold },
              ...schedule.conditions,
            };
            if (schedule.action === "delete") {
              const result = await FileAttachment.deleteMany(filter);
              deleted += result.deletedCount || 0;
            }
            break;
          }
          case "activity": {
            if (schedule.action === "delete") {
              const result = await ActivityLog.deleteMany({
                orgId,
                createdAt: { $lt: cutoff },
                ...schedule.conditions,
              });
              deleted += result.deletedCount || 0;
            }
            break;
          }
          case "task": {
            if (schedule.action === "delete") {
              const result = await Task.deleteMany({
                orgId,
                updatedAt: { $lt: cutoff },
                status: { $in: ["completed", "cancelled", "rejected"] },
                ...schedule.conditions,
              });
              deleted += result.deletedCount || 0;
            }
            break;
          }
        }

        await RetentionSchedule.updateOne(
          { id: schedule.id },
          { $set: { lastRunAt: new Date() } },
        );
      } catch (err) {
        errors++;
        logger.error({ scheduleId: schedule.id, error: (err as Error).message }, "Retention policy execution failed");
      }
    }

    logger.info({ orgId, deleted, archived, errors }, "Retention policies executed");
    return { deleted, archived, errors };
  }

  private async getHeldEntityIds(orgId: string, entityType: string): Promise<string[]> {
    const holds = await LegalHold.find({ orgId, isActive: true }).lean();
    const ids = new Set<string>();
    for (const hold of holds) {
      if (hold.scope === "org") return [];
      if (hold.scope === entityType) hold.scopeIds.forEach(id => ids.add(id));
    }
    return Array.from(ids);
  }

  async getLegalHoldReport(orgId: string): Promise<{
    totalHolds: number; activeHolds: number;
    totalCustodians: number; totalPreserved: number;
    holds: any[];
  }> {
    const [holds, totalPreserved, activeHolds] = await Promise.all([
      LegalHold.find({ orgId }).sort({ issuedAt: -1 }).lean(),
      PreservationRecord.countDocuments({ orgId }),
      LegalHold.countDocuments({ orgId, isActive: true }),
    ]);

    const custodianSet = new Set<string>();
    for (const hold of holds) {
      hold.custodians.forEach(c => custodianSet.add(c));
    }

    return {
      totalHolds: holds.length,
      activeHolds,
      totalCustodians: custodianSet.size,
      totalPreserved,
      holds,
    };
  }

  async getRetentionScheduleReport(orgId: string): Promise<{
    total: number; active: number;
    byEntity: Record<string, number>;
    byAction: Record<string, number>;
  }> {
    const [total, active, entityAgg, actionAgg] = await Promise.all([
      RetentionSchedule.countDocuments({ orgId }),
      RetentionSchedule.countDocuments({ orgId, isActive: true }),
      RetentionSchedule.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$entityType", count: { $sum: 1 } } },
      ]),
      RetentionSchedule.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]),
    ]);

    const byEntity: Record<string, number> = {};
    for (const a of entityAgg) byEntity[a._id] = a.count;
    const byAction: Record<string, number> = {};
    for (const a of actionAgg) byAction[a._id] = a.count;

    return { total, active, byEntity, byAction };
  }
}

export const retentionGovernance = new RetentionGovernance();
