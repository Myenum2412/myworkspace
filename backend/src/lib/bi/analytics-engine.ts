import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { Organization } from "../db/models/Organization.js";
import { Project } from "../db/models/Project.js";
import { Task } from "../db/models/Task.js";
import { User } from "../db/models/User.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { ActivityLog } from "../db/models/ActivityLog.js";
import { metricsRegistry } from "../monitoring/index.js";

export interface IDashboard extends Document {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: Record<string, unknown>;
  isDefault: boolean;
  roles: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  metric: string;
  aggregation: "count" | "sum" | "avg" | "min" | "max" | "trend";
  filters: Record<string, unknown>;
  period: "today" | "week" | "month" | "quarter" | "year" | "custom";
  visualization: "number" | "chart" | "table" | "gauge" | "trendline";
  size: "small" | "medium" | "large" | "full";
  config: Record<string, unknown>;
}

const dashboardSchema = new Schema<IDashboard>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  widgets: [{
    id: String, type: String, title: String, metric: String,
    aggregation: { type: String, enum: ["count", "sum", "avg", "min", "max", "trend"] },
    filters: { type: Schema.Types.Mixed, default: {} },
    period: { type: String, enum: ["today", "week", "month", "quarter", "year", "custom"] },
    visualization: { type: String, enum: ["number", "chart", "table", "gauge", "trendline"] },
    size: { type: String, enum: ["small", "medium", "large", "full"] },
    config: { type: Schema.Types.Mixed, default: {} },
  }],
  layout: { type: Schema.Types.Mixed, default: {} },
  isDefault: { type: Boolean, default: false },
  roles: [{ type: String }],
  createdBy: { type: String, required: true },
}, { timestamps: true });

export const Dashboard = model<IDashboard>("Dashboard", dashboardSchema);

export class BusinessIntelligenceEngine {
  async createDashboard(
    orgId: string,
    name: string,
    createdBy: string,
    template?: string,
  ): Promise<IDashboard> {
    const widgets = this.getTemplateWidgets(template);
    return Dashboard.create({
      id: uuid(), orgId, name,
      widgets,
      createdBy,
      isDefault: false,
      roles: ["admin", "manager"],
    });
  }

  private getTemplateWidgets(template?: string): DashboardWidget[] {
    const templates: Record<string, DashboardWidget[]> = {
      executive: [
        { id: uuid(), type: "kpi", title: "Active Projects", metric: "projects.active", aggregation: "count", filters: {}, period: "month", visualization: "number", size: "small", config: {} },
        { id: uuid(), type: "kpi", title: "Task Completion", metric: "tasks.completion_rate", aggregation: "avg", filters: {}, period: "month", visualization: "gauge", size: "small", config: { min: 0, max: 100 } },
        { id: uuid(), type: "kpi", title: "Team Members", metric: "users.active", aggregation: "count", filters: {}, period: "today", visualization: "number", size: "small", config: {} },
        { id: uuid(), type: "kpi", title: "Storage Used", metric: "storage.gb", aggregation: "sum", filters: {}, period: "month", visualization: "number", size: "small", config: {} },
        { id: uuid(), type: "chart", title: "Task Trends", metric: "tasks.weekly", aggregation: "trend", filters: {}, period: "month", visualization: "chart", size: "large", config: { chartType: "line" } },
        { id: uuid(), type: "table", title: "Recent Activity", metric: "activity.recent", aggregation: "count", filters: {}, period: "week", visualization: "table", size: "full", config: { maxRows: 10 } },
      ],
      productivity: [
        { id: uuid(), type: "chart", title: "Tasks by Status", metric: "tasks.by_status", aggregation: "count", filters: {}, period: "month", visualization: "chart", size: "medium", config: { chartType: "pie" } },
        { id: uuid(), type: "chart", title: "Completion Rate", metric: "tasks.completion_trend", aggregation: "trend", filters: {}, period: "month", visualization: "chart", size: "medium", config: { chartType: "bar" } },
        { id: uuid(), type: "chart", title: "Team Workload", metric: "tasks.per_user", aggregation: "count", filters: {}, period: "month", visualization: "chart", size: "large", config: { chartType: "bar" } },
      ],
      storage: [
        { id: uuid(), type: "chart", title: "Storage by File Type", metric: "storage.by_type", aggregation: "sum", filters: {}, period: "month", visualization: "chart", size: "medium", config: { chartType: "pie" } },
        { id: uuid(), type: "chart", title: "Storage Growth", metric: "storage.growth", aggregation: "trend", filters: {}, period: "year", visualization: "chart", size: "large", config: { chartType: "area" } },
        { id: uuid(), type: "table", title: "Largest Files", metric: "storage.largest",         aggregation: "sum", filters: {}, period: "year", visualization: "table", size: "full", config: { maxRows: 20, sortBy: "size" } },
      ],
    };
    return templates[template || "executive"] || templates.executive;
  }

  async getWidgetData(
    orgId: string,
    widget: DashboardWidget,
  ): Promise<{ value: number; trend?: number[]; labels?: string[] }> {
    const now = new Date();
    const periods: Record<string, Date> = {
      today: new Date(now.setHours(0, 0, 0, 0)),
      week: new Date(now.setDate(now.getDate() - 7)),
      month: new Date(now.setMonth(now.getMonth() - 1)),
      quarter: new Date(now.setMonth(now.getMonth() - 3)),
      year: new Date(now.setFullYear(now.getFullYear() - 1)),
    };
    const since = periods[widget.period] || periods.month;

    switch (widget.metric) {
      case "projects.active": {
        const count = await Project.countDocuments({ orgId });
        return { value: count };
      }
      case "tasks.completion_rate": {
        const [total, done] = await Promise.all([
          Task.countDocuments({ orgId }),
          Task.countDocuments({ orgId, status: "completed" }),
        ]);
        return { value: total > 0 ? Math.round((done / total) * 100) : 0 };
      }
      case "users.active": {
        const count = await User.countDocuments({ orgId, status: "online" });
        return { value: count };
      }
      case "storage.gb": {
        const files = await FileAttachment.find({ orgId }).lean();
        const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
        return { value: Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100 };
      }
      case "tasks.weekly": {
        const tasks = await Task.find({
          orgId,
          createdAt: { $gte: since },
        }).lean();
        const weeklyBuckets: number[] = [];
        const weekMs = 7 * 86400000;
        for (let i = 0; i < 4; i++) {
          const start = new Date(since.getTime() + i * weekMs);
          const end = new Date(start.getTime() + weekMs);
          weeklyBuckets.push(tasks.filter(t =>
            t.createdAt && new Date(t.createdAt) >= start && new Date(t.createdAt) < end,
          ).length);
        }
        return { value: weeklyBuckets.reduce((a, b) => a + b, 0), trend: weeklyBuckets };
      }
      case "activity.recent": {
        const logs = await ActivityLog.find({ orgId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();
        return { value: logs.length, labels: logs.map(l => l.action) };
      }
      case "tasks.by_status": {
        const [todo, inProgress, review, done, cancelled] = await Promise.all([
          Task.countDocuments({ orgId, status: "todo" }),
          Task.countDocuments({ orgId, status: "in_progress" }),
          Task.countDocuments({ orgId, status: "review" }),
          Task.countDocuments({ orgId, status: "completed" }),
          Task.countDocuments({ orgId, status: "cancelled" }),
        ]);
        return {
          value: todo + inProgress + review + done + cancelled,
          labels: ["Todo", "In Progress", "Review", "Done", "Cancelled"],
          trend: [todo, inProgress, review, done, cancelled],
        };
      }
      default:
        return { value: 0 };
    }
  }

  async getOrgHealthScore(orgId: string): Promise<{
    overall: number;
    categories: Record<string, number>;
    breakdown: Record<string, { score: number; max: number; label: string }>;
  }> {
    const [tasks, projects, users, files] = await Promise.all([
      Task.find({ orgId }).lean(),
      Project.find({ orgId }).lean(),
      User.find({ orgId }).lean(),
      FileAttachment.find({ orgId }).lean(),
    ]);

    const taskCompletionRate = tasks.length > 0
      ? tasks.filter(t => t.status === "completed").length / tasks.length : 0;
    const overdueTasks = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed",
    ).length;
    const engagementRate = users.length > 0
      ? users.filter(u => u.status === "online").length / users.length : 0;

    const productivity = Math.round(Math.min(100, (taskCompletionRate * 60 + Math.max(0, 1 - overdueTasks / Math.max(1, tasks.length)) * 40) * 100));
    const engagement = Math.round(Math.min(100, engagementRate * 100));
    const growthScore = projects.length > 5 ? 100 : Math.round((projects.length / 5) * 100);
    const storageUtil = files.length > 0
      ? Math.round(Math.min(100, (files.reduce((s, f) => s + (f.size || 0), 0) / (10 * 1024 * 1024 * 1024)) * 100))
      : 0;

    const categories = { productivity, engagement, growth: growthScore, storage: Math.max(0, 100 - storageUtil) };
    const overall = Math.round(Object.values(categories).reduce((a, b) => a + b, 0) / 4);

    return {
      overall,
      categories,
      breakdown: {
        taskCompletion: { score: Math.round(taskCompletionRate * 100), max: 100, label: "Task Completion" },
        overdueTasks: { score: Math.max(0, 100 - overdueTasks * 5), max: 100, label: "Overdue Tasks" },
        engagement: { score: Math.round(engagementRate * 100), max: 100, label: "Team Engagement" },
        storageHealth: { score: Math.max(0, 100 - storageUtil), max: 100, label: "Storage Health" },
      },
    };
  }
}

export const biEngine = new BusinessIntelligenceEngine();
