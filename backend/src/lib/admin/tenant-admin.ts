import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { Organization } from "../db/models/Organization.js";
import { User } from "../db/models/User.js";
import { OrgMember } from "../db/models/OrgMember.js";
import { Project } from "../db/models/Project.js";
import { Task } from "../db/models/Task.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { metricsRegistry } from "../monitoring/index.js";

export interface ITenantConfig extends Document {
  id: string;
  orgId: string;
  branding: {
    logo?: string;
    favicon?: string;
    primaryColor?: string;
    secondaryColor?: string;
    companyName?: string;
  };
  features: Record<string, boolean>;
  quotas: Record<string, number>;
  policies: {
    passwordMinLength: number;
    sessionTimeout: number;
    maxLoginAttempts: number;
    ipWhitelist: string[];
    allowedDomains: string[];
  };
  localization: {
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
  };
  retention: {
    auditLogDays: number;
    activityLogDays: number;
    deletedFileDays: number;
    sessionLogDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantConfigSchema = new Schema<ITenantConfig>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, unique: true },
  branding: {
    logo: String, favicon: String,
    primaryColor: { type: String, default: "#2563eb" },
    secondaryColor: { type: String, default: "#7c3aed" },
    companyName: String,
  },
  features: { type: Schema.Types.Mixed, default: {} },
  quotas: { type: Schema.Types.Mixed, default: {} },
  policies: {
    passwordMinLength: { type: Number, default: 8 },
    sessionTimeout: { type: Number, default: 1440 },
    maxLoginAttempts: { type: Number, default: 5 },
    ipWhitelist: [{ type: String }],
    allowedDomains: [{ type: String }],
  },
  localization: {
    timezone: { type: String, default: "UTC" },
    dateFormat: { type: String, default: "YYYY-MM-DD" },
    currency: { type: String, default: "USD" },
    language: { type: String, default: "en" },
  },
  retention: {
    auditLogDays: { type: Number, default: 365 },
    activityLogDays: { type: Number, default: 90 },
    deletedFileDays: { type: Number, default: 30 },
    sessionLogDays: { type: Number, default: 90 },
  },
}, { timestamps: true });

export const TenantConfig = model<ITenantConfig>("TenantConfig", tenantConfigSchema);

export class TenantAdminCenter {
  async initializeTenant(orgId: string): Promise<ITenantConfig> {
    const existing = await TenantConfig.findOne({ orgId }).lean();
    if (existing) return existing as any;

    return TenantConfig.create({
      id: uuid(), orgId,
      branding: {}, features: {}, quotas: {}, policies: {},
      localization: {}, retention: {},
    });
  }

  async getTenantSummary(orgId: string): Promise<{
    organization: any;
    usage: { users: number; projects: number; tasks: number; files: number; storageGB: number };
    health: { score: number; status: string };
    config: any | null;
  }> {
    const [org, users, projects, tasks, files, config] = await Promise.all([
      Organization.findOne({ id: orgId }).lean(),
      User.countDocuments({ orgId }),
      Project.countDocuments({ orgId }),
      Task.countDocuments({ orgId }),
      FileAttachment.find({ orgId }).lean(),
      TenantConfig.findOne({ orgId }).lean(),
    ]);

    const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
    const storageGB = Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100;

    const tasksCompleted = await Task.countDocuments({ orgId, status: "completed" }).catch(() => 0);
    const completionRate = tasks > 0 ? Math.round((tasksCompleted / tasks) * 100) : 0;
    const healthScore = Math.min(100, Math.round(
      (users > 0 ? 20 : 0) + (projects > 0 ? 10 : 0) + (completionRate * 0.5) + 20
    ));

    return {
      organization: org,
      usage: { users, projects, tasks, files: files.length, storageGB },
      health: {
        score: healthScore,
        status: healthScore >= 80 ? "healthy" : healthScore >= 50 ? "warning" : "critical",
      },
      config,
    };
  }

  async getSystemWideStats(): Promise<{
    totalOrgs: number;
    totalUsers: number;
    totalProjects: number;
    totalTasks: number;
    totalFiles: number;
    totalStorageGB: number;
    activeSessions: number;
    orgsByPlan: Record<string, number>;
  }> {
    const [orgs, users, projects, tasks, files] = await Promise.all([
      Organization.find({}).lean(),
      User.countDocuments({}),
      Project.countDocuments({}),
      Task.countDocuments({}),
      FileAttachment.find({}).lean(),
    ]);

    const totalBytes = files.reduce((s, f) => s + (f.size || 0), 0);
    const orgsByPlan: Record<string, number> = {};
    for (const org of orgs) {
      const plan = org.plan || "free";
      orgsByPlan[plan] = (orgsByPlan[plan] || 0) + 1;
    }

    return {
      totalOrgs: orgs.length,
      totalUsers: users,
      totalProjects: projects,
      totalTasks: tasks,
      totalFiles: files.length,
      totalStorageGB: Math.round((totalBytes / (1024 * 1024 * 1024)) * 100) / 100,
      activeSessions: 0,
      orgsByPlan,
    };
  }
}

export const tenantAdmin = new TenantAdminCenter();
