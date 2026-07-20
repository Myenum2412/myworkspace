import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { Task } from "../db/models/Task.js";
import { Project } from "../db/models/Project.js";
import { Notification } from "../db/models/Notification.js";

export type SLAPriority = "P0" | "P1" | "P2" | "P3";
export type SLAPhase = "response" | "acknowledge" | "resolve" | "review";

export interface ISLADefinition extends Document {
  id: string;
  orgId: string;
  name: string;
  priority: SLAPriority;
  targets: Record<SLAPhase, number>;
  calendar: "24x7" | "business_hours";
  escalationPath: string[];
  notifyOnBreach: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISLAEntry extends Document {
  id: string;
  orgId: string;
  slaId: string;
  taskId: string;
  priority: SLAPriority;
  status: "active" | "breached" | "met" | "cancelled";
  phases: {
    response: { targetMinutes: number; startedAt?: Date; completedAt?: Date; breached: boolean };
    acknowledge: { targetMinutes: number; startedAt?: Date; completedAt?: Date; breached: boolean };
    resolve: { targetMinutes: number; startedAt?: Date; completedAt?: Date; breached: boolean };
  };
  breachedAt?: Date;
  escalatedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApprovalRequest extends Document {
  id: string;
  orgId: string;
  entityType: "task" | "project" | "file" | "workflow" | "membership";
  entityId: string;
  requestorId: string;
  approverIds: string[];
  approvedBy: string[];
  rejectedBy: string[];
  status: "pending" | "approved" | "rejected" | "cancelled";
  comments: { userId: string; text: string; createdAt: Date }[];
  requiredApprovals: number;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const slaDefinitionSchema = new Schema<ISLADefinition>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  priority: { type: String, enum: ["P0", "P1", "P2", "P3"], required: true },
  targets: {
    response: { type: Number, default: 15 },
    acknowledge: { type: Number, default: 30 },
    resolve: { type: Number, default: 240 },
    review: { type: Number, default: 60 },
  },
  calendar: { type: String, enum: ["24x7", "business_hours"], default: "24x7" },
  escalationPath: [{ type: String }],
  notifyOnBreach: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const slaEntrySchema = new Schema<ISLAEntry>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  slaId: { type: String, required: true },
  taskId: { type: String, required: true, index: true },
  priority: { type: String, enum: ["P0", "P1", "P2", "P3"], required: true },
  status: { type: String, enum: ["active", "breached", "met", "cancelled"], default: "active" },
  phases: {
    response: {
      targetMinutes: Number, startedAt: Date, completedAt: Date, breached: { type: Boolean, default: false },
    },
    acknowledge: {
      targetMinutes: Number, startedAt: Date, completedAt: Date, breached: { type: Boolean, default: false },
    },
    resolve: {
      targetMinutes: Number, startedAt: Date, completedAt: Date, breached: { type: Boolean, default: false },
    },
  },
  breachedAt: Date,
  escalatedTo: String,
}, { timestamps: true });

const approvalRequestSchema = new Schema<IApprovalRequest>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  entityType: { type: String, enum: ["task", "project", "file", "workflow", "membership"], required: true },
  entityId: { type: String, required: true },
  requestorId: { type: String, required: true },
  approverIds: [{ type: String }],
  approvedBy: [{ type: String }],
  rejectedBy: [{ type: String }],
  status: { type: String, enum: ["pending", "approved", "rejected", "cancelled"], default: "pending" },
  comments: [{ userId: String, text: String, createdAt: { type: Date, default: Date.now } }],
  requiredApprovals: { type: Number, default: 1 },
  expiresAt: Date,
}, { timestamps: true });

export const SLADefinition = model<ISLADefinition>("SLADefinition", slaDefinitionSchema);
export const SLAEntry = model<ISLAEntry>("SLAEntry", slaEntrySchema);
export const ApprovalRequest = model<IApprovalRequest>("ApprovalRequest", approvalRequestSchema);

export class SLAEngine {
  async defineSLA(params: {
    orgId: string; name: string; priority: SLAPriority;
    targets: Record<SLAPhase, number>; escalationPath?: string[];
  }): Promise<ISLADefinition> {
    return SLADefinition.create({
      id: uuid(), ...params,
      escalationPath: params.escalationPath || [],
      calendar: "24x7",
      notifyOnBreach: true,
      isActive: true,
    });
  }

  async startSLATracking(taskId: string, orgId: string): Promise<ISLAEntry | null> {
    const task = await Task.findOne({ id: taskId, orgId }).lean();
    if (!task) return null;

    const priorityMap: Record<string, SLAPriority> = {
      urgent: "P0", high: "P1", medium: "P2", low: "P3",
    };
    const priority = priorityMap[task.priority] || "P2";

    const slaDef = await SLADefinition.findOne({ orgId, priority, isActive: true }).lean();
    if (!slaDef) return null;

    const entry = await SLAEntry.create({
      id: uuid(),
      orgId,
      slaId: slaDef.id,
      taskId,
      priority,
      status: "active",
      phases: {
        response: { targetMinutes: slaDef.targets.response || 15, startedAt: new Date(), breached: false },
        acknowledge: { targetMinutes: slaDef.targets.acknowledge || 30, breached: false },
        resolve: { targetMinutes: slaDef.targets.resolve || 240, breached: false },
      },
    });

    return entry;
  }

  async checkBreaches(orgId: string): Promise<ISLAEntry[]> {
    const active = await SLAEntry.find({ orgId, status: "active" }).lean();
    const breached: any[] = [];
    const now = Date.now();

    for (const entry of active) {
      let breachedPhase = false;

      if (entry.phases.response.startedAt && !entry.phases.response.completedAt) {
        const elapsed = (now - new Date(entry.phases.response.startedAt).getTime()) / 60000;
        if (elapsed > entry.phases.response.targetMinutes) {
          breachedPhase = true;
          await SLAEntry.updateOne(
            { id: entry.id },
            { "phases.response.breached": true, status: "breached", breachedAt: new Date() },
          );
        }
      }

      if (entry.phases.acknowledge.startedAt && !entry.phases.acknowledge.completedAt) {
        const elapsed = (now - new Date(entry.phases.acknowledge.startedAt).getTime()) / 60000;
        if (elapsed > entry.phases.acknowledge.targetMinutes) {
          breachedPhase = true;
          await SLAEntry.updateOne(
            { id: entry.id },
            { "phases.acknowledge.breached": true, status: "breached", breachedAt: new Date() },
          );
        }
      }

      if (breachedPhase) {
        const slaDef = await SLADefinition.findOne({ id: entry.slaId }).lean();
        if (slaDef?.notifyOnBreach) {
          await this.sendBreachNotification(entry);
        }
        if (slaDef?.escalationPath?.length) {
          await this.escalateBreach(entry, slaDef.escalationPath);
        }
        breached.push(entry);
      }
    }

    return breached;
  }

  private async sendBreachNotification(entry: any): Promise<void> {
    await Notification.create({
      userId: entry.escalatedTo || "",
      orgId: entry.orgId,
      type: "sla_breach",
      title: "SLA Breach Detected",
      message: `SLA breached for task ${entry.taskId} (${entry.priority})`,
      read: false,
    });
  }

  private async escalateBreach(entry: any, escalationPath: string[]): Promise<void> {
    const next = escalationPath[0];
    if (next) {
      await SLAEntry.updateOne({ id: entry.id }, { escalatedTo: next });
      await Task.updateOne({ id: entry.taskId }, { $inc: { priority: 1 } });
    }
  }

  async getSLAReport(orgId: string): Promise<{
    total: number; active: number; breached: number; met: number;
    byPriority: Record<string, number>;
    avgResponseMinutes: number;
  }> {
    const [entries, stats] = await Promise.all([
      SLAEntry.find({ orgId }).lean(),
      SLAEntry.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
    ]);

    const byPriority: Record<string, number> = {};
    for (const s of stats) byPriority[s._id] = s.count;

    const completedResponse = entries.filter(e => e.phases.response.completedAt && e.phases.response.startedAt);
    const avgResponseMinutes = completedResponse.length > 0
      ? Math.round(completedResponse.reduce((s, e) => {
          return s + (new Date(e.phases.response.completedAt!).getTime() - new Date(e.phases.response.startedAt!).getTime()) / 60000;
        }, 0) / completedResponse.length)
      : 0;

    return {
      total: entries.length,
      active: entries.filter(e => e.status === "active").length,
      breached: entries.filter(e => e.status === "breached").length,
      met: entries.filter(e => e.status === "met").length,
      byPriority,
      avgResponseMinutes,
    };
  }
}

export class ApprovalEngine {
  async createApprovalRequest(params: {
    orgId: string; entityType: IApprovalRequest["entityType"]; entityId: string;
    requestorId: string; approverIds: string[];
    requiredApprovals?: number; expiresInHours?: number;
  }): Promise<IApprovalRequest> {
    return ApprovalRequest.create({
      id: uuid(), ...params,
      requiredApprovals: params.requiredApprovals || 1,
      approvedBy: [],
      rejectedBy: [],
      comments: [],
      expiresAt: params.expiresInHours ? new Date(Date.now() + params.expiresInHours * 3600000) : undefined,
    });
  }

  async approve(approvalId: string, userId: string, comment?: string): Promise<IApprovalRequest | null> {
    const request = await ApprovalRequest.findOne({ id: approvalId, status: "pending" });
    if (!request) return null;

    if (request.approvedBy.includes(userId) || request.rejectedBy.includes(userId)) return request;
    if (request.expiresAt && new Date() > request.expiresAt) {
      request.status = "cancelled";
      await request.save();
      return request;
    }

    request.approvedBy.push(userId);
    if (comment) request.comments.push({ userId, text: comment, createdAt: new Date() });

    if (request.approvedBy.length >= request.requiredApprovals) {
      request.status = "approved";
      await this.onApproved(request);
    }

    await request.save();
    return request;
  }

  async reject(approvalId: string, userId: string, reason: string): Promise<IApprovalRequest | null> {
    const request = await ApprovalRequest.findOne({ id: approvalId, status: "pending" });
    if (!request) return null;

    request.status = "rejected";
    request.rejectedBy.push(userId);
    request.comments.push({ userId, text: reason, createdAt: new Date() });
    await request.save();
    await this.onRejected(request);
    return request;
  }

  private async onApproved(request: IApprovalRequest): Promise<void> {
    if (request.entityType === "task") {
      await Task.updateOne({ id: request.entityId }, { status: "approved" });
    }
  }

  private async onRejected(request: IApprovalRequest): Promise<void> {
    if (request.entityType === "task") {
      await Task.updateOne({ id: request.entityId }, { status: "rejected" });
    }
  }

  async getPendingApprovals(userId: string, orgId: string): Promise<IApprovalRequest[]> {
    return ApprovalRequest.find({ orgId, approverIds: userId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean() as any;
  }
}

export const slaEngine = new SLAEngine();
export const approvalEngine = new ApprovalEngine();
