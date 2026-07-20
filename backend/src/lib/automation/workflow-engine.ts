import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { Notification } from "../db/models/Notification.js";

export type WorkflowTrigger = "task.created" | "task.updated" | "task.completed" | "file.uploaded" | "file.approved" | "project.created" | "project.completed" | "user.joined" | "schedule" | "webhook";
export type WorkflowAction = "notification" | "email" | "webhook" | "status_change" | "assign" | "escalate" | "approval";

export interface IWorkflow extends Document {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowActionDef[];
  isActive: boolean;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowCondition {
  field: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "before" | "after";
  value: unknown;
}

export interface WorkflowActionDef {
  type: WorkflowAction;
  config: Record<string, unknown>;
  order: number;
}

export interface IWorkflowExecution extends Document {
  id: string;
  workflowId: string;
  orgId: string;
  trigger: WorkflowTrigger;
  context: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  actionsCompleted: number;
  actionsTotal: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

const workflowSchema = new Schema<IWorkflow>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  trigger: { type: String, required: true, index: true },
  triggerConfig: { type: Schema.Types.Mixed, default: {} },
  conditions: [{
    field: String,
    operator: { type: String, enum: ["equals", "not_equals", "contains", "greater_than", "less_than", "before", "after"] },
    value: Schema.Types.Mixed,
  }],
  actions: [{
    type: { type: String, enum: ["notification", "email", "webhook", "status_change", "assign", "escalate", "approval"] },
    config: { type: Schema.Types.Mixed, default: {} },
    order: Number,
  }],
  isActive: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  createdBy: { type: String, required: true },
}, { timestamps: true });

workflowSchema.index({ orgId: 1, trigger: 1, isActive: 1 });

const workflowExecutionSchema = new Schema<IWorkflowExecution>({
  id: { type: String, required: true, unique: true },
  workflowId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  trigger: { type: String, required: true },
  context: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["pending", "running", "completed", "failed", "skipped"], default: "pending", index: true },
  actionsCompleted: { type: Number, default: 0 },
  actionsTotal: { type: Number, default: 0 },
  error: String,
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
});

export const Workflow = model<IWorkflow>("Workflow", workflowSchema);
export const WorkflowExecution = model<IWorkflowExecution>("WorkflowExecution", workflowExecutionSchema);

export class WorkflowEngine {
  async createWorkflow(params: {
    orgId: string; name: string; trigger: WorkflowTrigger;
    triggerConfig?: Record<string, unknown>;
    conditions?: WorkflowCondition[]; actions: WorkflowActionDef[];
    createdBy: string;
  }): Promise<IWorkflow> {
    return Workflow.create({
      id: uuid(), ...params,
      triggerConfig: params.triggerConfig || {},
      conditions: params.conditions || [],
      isActive: true, version: 1,
    });
  }

  async evaluateAndExecute(
    orgId: string,
    trigger: WorkflowTrigger,
    context: Record<string, unknown>,
  ): Promise<void> {
    const workflows = await Workflow.find({ orgId, trigger, isActive: true }).lean();
    for (const wf of workflows) {
      try {
        const conditionsMet = this.evaluateConditions(wf.conditions, context);
        if (!conditionsMet) continue;

        const execution = await WorkflowExecution.create({
          id: uuid(),
          workflowId: wf.id,
          orgId,
          trigger,
          context,
          status: "running",
          actionsTotal: wf.actions.length,
          startedAt: new Date(),
        });

        for (const action of wf.actions.sort((a, b) => a.order - b.order)) {
          try {
            await this.executeAction(action, context, orgId);
            await WorkflowExecution.updateOne(
              { id: execution.id },
              { $inc: { actionsCompleted: 1 } },
            );
          } catch (err) {
            logger.error({ workflowId: wf.id, action: action.type, error: (err as Error).message }, "Workflow action failed");
            await WorkflowExecution.updateOne(
              { id: execution.id },
              { status: "failed", error: (err as Error).message, completedAt: new Date() },
            );
            return;
          }
        }

        await WorkflowExecution.updateOne(
          { id: execution.id },
          { status: "completed", completedAt: new Date() },
        );
      } catch (err) {
        logger.error({ workflowId: wf.id, error: (err as Error).message }, "Workflow execution failed");
      }
    }
  }

  private evaluateConditions(
    conditions: WorkflowCondition[],
    context: Record<string, unknown>,
  ): boolean {
    if (!conditions.length) return true;
    return conditions.every(c => {
      const value = context[c.field];
      switch (c.operator) {
        case "equals": return value === c.value;
        case "not_equals": return value !== c.value;
        case "contains": return String(value).includes(String(c.value));
        case "greater_than": return Number(value) > Number(c.value);
        case "less_than": return Number(value) < Number(c.value);
        default: return true;
      }
    });
  }

  private async executeAction(
    action: WorkflowActionDef,
    context: Record<string, unknown>,
    orgId: string,
  ): Promise<void> {
    switch (action.type) {
      case "notification": {
        await Notification.create({
          userId: String(action.config.userId || context.userId || ""),
          orgId,
          type: "workflow",
          title: String(action.config.title || "Workflow Notification"),
          message: this.interpolate(String(action.config.message || ""), context),
          link: String(action.config.link || ""),
          read: false,
        });
        break;
      }
      case "status_change": {
        const { Task } = await import("../db/models/Task.js");
        await Task.updateOne(
          { id: String(context.taskId || "") },
          { status: String(action.config.status) },
        );
        break;
      }
      case "webhook": {
        const url = String(action.config.url || "");
        if (url) {
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ trigger: context, timestamp: new Date().toISOString() }),
          }).catch(() => {});
        }
        break;
      }
      case "escalate": {
        const { Task } = await import("../db/models/Task.js");
        const assignee = String(action.config.assignee || "");
        if (assignee) {
          await Task.updateOne(
            { id: String(context.taskId || "") },
            { $set: { assignee }, $inc: { priority: 1 } },
          );
        }
        break;
      }
    }
  }

  private interpolate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] || `{{${key}}}`));
  }

  async getExecutionHistory(orgId: string, limit = 50): Promise<any[]> {
    return WorkflowExecution.find({ orgId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
  }

  async getWorkflowStats(orgId: string): Promise<{
    total: number;
    active: number;
    executions: number;
    successRate: number;
  }> {
    const [total, active, executions, succeeded] = await Promise.all([
      Workflow.countDocuments({ orgId }),
      Workflow.countDocuments({ orgId, isActive: true }),
      WorkflowExecution.countDocuments({ orgId }),
      WorkflowExecution.countDocuments({ orgId, status: "completed" }),
    ]);

    return {
      total, active, executions,
      successRate: executions > 0 ? Math.round((succeeded / executions) * 100) : 0,
    };
  }
}

export const workflowEngine = new WorkflowEngine();
