import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { Task } from "../db/models/Task.js";
import { Project } from "../db/models/Project.js";
import { User } from "../db/models/User.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { ActivityLog } from "../db/models/ActivityLog.js";
import { Organization } from "../db/models/Organization.js";
import { biEngine } from "./analytics-engine.js";

export interface IReportSchedule extends Document {
  id: string;
  orgId: string;
  name: string;
  type: "executive" | "productivity" | "storage" | "compliance" | "custom";
  format: "pdf" | "csv" | "json";
  cron: string;
  recipients: string[];
  filters: Record<string, unknown>;
  isActive: boolean;
  lastGeneratedAt?: Date;
  createdBy: string;
  createdAt: Date;
}

export interface IKPITrend extends Document {
  id: string;
  orgId: string;
  metric: string;
  period: "day" | "week" | "month" | "quarter";
  value: number;
  recordedAt: Date;
}

export interface IDrillDownReport {
  summary: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  detail: Record<string, unknown>[];
  total: number;
  page: number;
  pageSize: number;
}

const reportScheduleSchema = new Schema<IReportSchedule>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ["executive", "productivity", "storage", "compliance", "custom"], required: true },
  format: { type: String, enum: ["pdf", "csv", "json"], default: "json" },
  cron: { type: String, required: true },
  recipients: [{ type: String }],
  filters: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  lastGeneratedAt: Date,
  createdBy: String,
}, { timestamps: true });

const kpiTrendSchema = new Schema<IKPITrend>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  metric: { type: String, required: true },
  period: { type: String, enum: ["day", "week", "month", "quarter"], required: true },
  value: { type: Number, required: true },
  recordedAt: { type: Date, default: Date.now },
});

kpiTrendSchema.index({ orgId: 1, metric: 1, recordedAt: -1 });

export const ReportSchedule = model<IReportSchedule>("ReportSchedule", reportScheduleSchema);
export const KPITrend = model<IKPITrend>("KPITrend", kpiTrendSchema);

export class ReportingEngine {
  async scheduleReport(params: {
    orgId: string; name: string; type: IReportSchedule["type"];
    format?: IReportSchedule["format"]; cron: string;
    recipients?: string[]; createdBy: string;
  }): Promise<IReportSchedule> {
    return ReportSchedule.create({
      id: uuid(), ...params,
      format: params.format || "json",
      recipients: params.recipients || [],
      filters: {},
      isActive: true,
    });
  }

  async generateExecutiveReport(orgId: string): Promise<Record<string, unknown>> {
    const [org, tasks, projects, users, files, health] = await Promise.all([
      Organization.findOne({ id: orgId }).lean(),
      Task.find({ orgId }).lean(),
      Project.find({ orgId }).lean(),
      User.find({ orgId }).lean(),
      FileAttachment.find({ orgId }).lean(),
      biEngine.getOrgHealthScore(orgId),
    ]);

    const completed = tasks.filter(t => t.status === "completed").length;
    const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed");
    const activeUsers = users.filter(u => u.status === "online").length;
    const storageBytes = files.reduce((s, f) => s + (f.size || 0), 0);

    const tasksByStatus: Record<string, number> = {};
    for (const t of tasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    }

    const taskTrend: number[] = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now - (i + 1) * 86400000);
      const end = new Date(now - i * 86400000);
      taskTrend.push(tasks.filter(t => t.createdAt && new Date(t.createdAt) >= start && new Date(t.createdAt) < end).length);
    }

    return {
      reportType: "executive",
      generatedAt: new Date().toISOString(),
      organization: { id: orgId, name: org?.name || orgId, plan: org?.plan },
      healthScore: health.overall,
      kpi: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: completed,
        completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        overdueTasks: overdue.length,
        totalUsers: users.length,
        activeUsers,
        engagementRate: users.length > 0 ? Math.round((activeUsers / users.length) * 100) : 0,
        storageUsedGB: Math.round((storageBytes / (1024 * 1024 * 1024)) * 100) / 100,
        totalFiles: files.length,
      },
      trends: {
        tasksByStatus,
        dailyTaskCreation: taskTrend,
        projectsPerUser: users.length > 0 ? Math.round((projects.length / users.length) * 10) / 10 : 0,
        tasksPerProject: projects.length > 0 ? Math.round((tasks.length / projects.length) * 10) / 10 : 0,
      },
    };
  }

  async drillDown(
    orgId: string,
    dimension: string,
    filters: Record<string, unknown>,
    page = 1,
    pageSize = 20,
  ): Promise<IDrillDownReport> {
    const baseFilter: Record<string, unknown> = { orgId, ...filters };

    switch (dimension) {
      case "tasks_by_status": {
        const match: Record<string, unknown> = {};
        if (filters.status) match.status = filters.status;
        const results = await Task.find({ ...baseFilter, ...match })
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .select("title status priority assigneeId dueDate createdAt")
          .lean();
        const total = await Task.countDocuments({ ...baseFilter, ...match });
        return {
          summary: { dimension: "tasks_by_status", appliedFilters: filters },
          dimensions: { statuses: ["draft", "assigned", "in_progress", "completed", "cancelled"] },
          detail: results,
          total,
          page,
          pageSize,
        };
      }
      case "tasks_by_user": {
        const userId = String(filters.userId || "");
        const results = await Task.find({ orgId, assigneeId: userId })
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .select("title status priority dueDate createdAt")
          .lean();
        const total = await Task.countDocuments({ orgId, assigneeId: userId });
        const user = await User.findOne({ id: userId }).select("name email").lean();
        return {
          summary: { dimension: "tasks_by_user", user: user || { id: userId } },
          dimensions: {},
          detail: results,
          total,
          page,
          pageSize,
        };
      }
      case "storage_by_type": {
        const results = await FileAttachment.find(baseFilter)
          .sort({ size: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .select("name mimeType size createdAt")
          .lean();
        const total = await FileAttachment.countDocuments(baseFilter);
        const typeBreakdown = await FileAttachment.aggregate([
          { $match: { orgId } },
          { $group: { _id: "$mimeType", count: { $sum: 1 }, totalBytes: { $sum: "$size" } } },
          { $sort: { totalBytes: -1 } },
        ]);
        return {
          summary: { dimension: "storage_by_type", totalBytes: results.reduce((s, f) => s + (f.size || 0), 0) },
          dimensions: { typeBreakdown },
          detail: results,
          total,
          page,
          pageSize,
        };
      }
      default: {
        const results = await ActivityLog.find(baseFilter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean();
        const total = await ActivityLog.countDocuments(baseFilter);
        return {
          summary: { dimension: "activity_log", appliedFilters: filters },
          dimensions: {},
          detail: results,
          total,
          page,
          pageSize,
        };
      }
    }
  }

  async recordKPITrend(orgId: string, metric: string, period: IKPITrend["period"]): Promise<void> {
    let value = 0;
    const now = new Date();
    let since: Date;

    switch (period) {
      case "day": since = new Date(now.setHours(0, 0, 0, 0)); break;
      case "week": since = new Date(now.setDate(now.getDate() - 7)); break;
      case "month": since = new Date(now.setMonth(now.getMonth() - 1)); break;
      case "quarter": since = new Date(now.setMonth(now.getMonth() - 3)); break;
    }

    switch (metric) {
      case "tasks.created":
        value = await Task.countDocuments({ orgId, createdAt: { $gte: since } });
        break;
      case "tasks.completed":
        value = await Task.countDocuments({ orgId, status: "completed", updatedAt: { $gte: since } });
        break;
      case "users.active":
        value = await User.countDocuments({ orgId, status: "online" });
        break;
      case "storage.added_mb":
        const files = await FileAttachment.find({ orgId, createdAt: { $gte: since } }).lean();
        value = Math.round(files.reduce((s, f) => s + (f.size || 0), 0) / (1024 * 1024));
        break;
      case "projects.created":
        value = await Project.countDocuments({ orgId, createdAt: { $gte: since } });
        break;
      default:
        return;
    }

    await KPITrend.create({ id: uuid(), orgId, metric, period, value, recordedAt: new Date() });
  }

  async getKPITrends(
    orgId: string,
    metric: string,
    period: IKPITrend["period"],
    limit = 30,
  ): Promise<{ values: { date: Date; value: number }[]; trend: "up" | "down" | "stable"; changePercent: number }> {
    const records = await KPITrend.find({ orgId, metric, period })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();

    const values = records.map(r => ({ date: r.recordedAt, value: r.value })).reverse();
    const changePercent = values.length >= 2
      ? Math.round(((values[values.length - 1].value - values[0].value) / Math.max(1, values[0].value)) * 100)
      : 0;
    const trend: "up" | "down" | "stable" = changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable";

    return { values, trend, changePercent };
  }
}

export const reportingEngine = new ReportingEngine();
