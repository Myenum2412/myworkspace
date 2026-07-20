import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";
import { Organization } from "../db/models/Organization.js";
import { Project } from "../db/models/Project.js";
import { Task } from "../db/models/Task.js";
import { User } from "../db/models/User.js";
import { FileAttachment } from "../db/models/FileAttachment.js";

export interface Insight {
  type: string;
  severity: "info" | "warning" | "critical";
  category: "productivity" | "storage" | "security" | "workflow" | "capacity" | "engagement";
  title: string;
  description: string;
  metric: string;
  currentValue: number;
  threshold: number;
  recommendation: string;
  entities: Record<string, string>;
}

export interface Prediction {
  metric: string;
  predictedValue: number;
  confidence: number;
  timeframe: string;
  model: string;
}

export class EnterpriseAIEngine {
  async analyzeOrganization(orgId: string): Promise<{
    healthScore: number;
    insights: Insight[];
    predictions: Prediction[];
  }> {
    const [org, projects, tasks, users, files] = await Promise.all([
      Organization.findOne({ id: orgId }).lean(),
      Project.find({ orgId }).lean(),
      Task.find({ orgId }).lean(),
      User.find({ orgId }).lean(),
      FileAttachment.find({ orgId }).lean(),
    ]);

    const insights: Insight[] = [];
    const predictions: Prediction[] = [];
    let score = 85;

    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed");
    if (overdueTasks.length > 5) {
      insights.push({
        type: "overdue_tasks",
        severity: overdueTasks.length > 20 ? "critical" : "warning",
        category: "productivity",
        title: "Task Backlog Growing",
        description: `${overdueTasks.length} tasks are past their due date`,
        metric: "overdue_task_count",
        currentValue: overdueTasks.length,
        threshold: 5,
        recommendation: "Consider reassigning overdue tasks or adjusting deadlines",
        entities: { orgId },
      });
      score -= Math.min(15, overdueTasks.length);
    }

    const activeUsers = users.filter(u => u.status === "online").length;
    const totalUsers = users.length;
    if (totalUsers > 0 && activeUsers / totalUsers < 0.1) {
      insights.push({
        type: "low_engagement",
        severity: "warning",
        category: "engagement",
        title: "Low Team Engagement",
        description: `Only ${activeUsers} of ${totalUsers} users are currently active`,
        metric: "engagement_rate",
        currentValue: Math.round((activeUsers / totalUsers) * 100),
        threshold: 10,
        recommendation: "Review recent activity and consider re-engagement strategies",
        entities: { orgId },
      });
      score -= 5;
    }

    const totalFileSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    const storageGB = totalFileSize / (1024 * 1024 * 1024);
    if (storageGB > 5) {
      insights.push({
        type: "storage_growth",
        severity: storageGB > 50 ? "critical" : "info",
        category: "storage",
        title: "Storage Consumption Growing",
        description: `${storageGB.toFixed(1)} GB used across ${files.length} files`,
        metric: "storage_gb",
        currentValue: Math.round(storageGB),
        threshold: 5,
        recommendation: "Review file retention policies and archive old files",
        entities: { orgId },
      });

      const dailyRate = files.length / Math.max(1, (Date.now() - (org?.createdAt?.getTime() || Date.now())) / 86400000);
      const projectedFiles = files.length + dailyRate * 365;
      predictions.push({
        metric: "files_count",
        predictedValue: Math.round(projectedFiles),
        confidence: 0.7,
        timeframe: "1 year",
        model: "linear_trend",
      });
    }

    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const taskCompletionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;
    if (taskCompletionRate < 0.3 && tasks.length > 10) {
      insights.push({
        type: "low_completion_rate",
        severity: "warning",
        category: "productivity",
        title: "Low Task Completion Rate",
        description: `Only ${Math.round(taskCompletionRate * 100)}% of tasks completed`,
        metric: "completion_rate",
        currentValue: Math.round(taskCompletionRate * 100),
        threshold: 30,
        recommendation: "Review workload distribution and team capacity",
        entities: { orgId },
      });
      score -= 10;
    }

    if (tasks.length > 10) {
      const monthlyRate = tasks.length / Math.max(1, (Date.now() - (org?.createdAt?.getTime() || Date.now())) / (86400000 * 30));
      predictions.push({
        metric: "task_volume",
        predictedValue: Math.round(tasks.length + monthlyRate * 3),
        confidence: 0.75,
        timeframe: "3 months",
        model: "moving_average",
      });
    }

    const projectsCount = projects.length;
    const usersPerProject = projectsCount > 0 ? users.length / projectsCount : 0;
    if (usersPerProject < 1) {
      insights.push({
        type: "thin_project_staffing",
        severity: "info",
        category: "workflow",
        title: "Thin Project Staffing",
        description: `Average ${usersPerProject.toFixed(1)} users per project`,
        metric: "users_per_project",
        currentValue: Math.round(usersPerProject * 10) / 10,
        threshold: 1,
        recommendation: "Consider consolidating projects or redistributing team members",
        entities: { orgId },
      });
    }

    const healthScore = Math.max(0, Math.min(100, score));

    return {
      healthScore,
      insights: insights.slice(0, 10),
      predictions: predictions.slice(0, 5),
    };
  }

  async getRecommendations(orgId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    impact: "low" | "medium" | "high" | "critical";
    effort: "minutes" | "hours" | "days";
    category: string;
    action: string;
  }>> {
    const recs: Array<{
      id: string; title: string; description: string;
      impact: "low" | "medium" | "high" | "critical";
      effort: "minutes" | "hours" | "days";
      category: string; action: string;
    }> = [];

    const files = await FileAttachment.find({ orgId }).lean();
    const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);
    if (totalSize > 10 * 1024 * 1024 * 1024) {
      recs.push({
        id: "archive_old_files",
        title: "Archive Files Older Than 1 Year",
        description: `${files.filter(f => f.createdAt && Date.now() - new Date(f.createdAt).getTime() > 365*86400000).length} files may be eligible for archival`,
        impact: "high", effort: "hours", category: "storage",
        action: "Review and archive old files via Settings > Storage",
      });
    }

    const tasks = await Task.find({ orgId, status: "todo" }).lean();
    if (tasks.length > 100) {
      recs.push({
        id: "cleanup_stale_tasks",
        title: "Review Stale Todo Tasks",
        description: `${tasks.length} tasks in todo status — consider pruning or reassigning`,
        impact: "medium", effort: "hours", category: "productivity",
        action: "Review open tasks and close stale ones",
      });
    }

    return recs;
  }

  async getExecutiveSummary(orgId: string): Promise<Record<string, unknown>> {
    const [tasks, projects, users, files] = await Promise.all([
      Task.find({ orgId }).lean(),
      Project.find({ orgId }).lean(),
      User.find({ orgId }).lean(),
      FileAttachment.find({ orgId }).lean(),
    ]);

    const completedTasks = tasks.filter(t => t.status === "completed").length;
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed");
    const activeUsers = users.filter(u => u.status === "online").length;
    const totalFileSize = files.reduce((s, f) => s + (f.size || 0), 0);

    return {
      organization: orgId,
      summary: {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks,
        overdueTasks: overdueTasks.length,
        taskCompletionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        totalUsers: users.length,
        activeUsers,
        totalFiles: files.length,
        storageUsedGB: Math.round((totalFileSize / (1024 * 1024 * 1024)) * 100) / 100,
      },
      trends: {
        tasksPerProject: projects.length > 0 ? Math.round((tasks.length / projects.length) * 10) / 10 : 0,
        usersPerProject: projects.length > 0 ? Math.round((users.length / projects.length) * 10) / 10 : 0,
        averageFileSizeMB: files.length > 0 ? Math.round((totalFileSize / files.length / (1024 * 1024)) * 100) / 100 : 0,
      },
    };
  }
}

export const aiEngine = new EnterpriseAIEngine();
