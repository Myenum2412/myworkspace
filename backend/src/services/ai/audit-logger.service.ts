import { AiAuditLog } from "../../lib/db/models/AiAuditLog.js";
import { AiUsageLog } from "../../lib/db/models/AiUsageLog.js";
import { CostCalculator } from "./cost-calculator.service.js";

interface AuditLogEntry {
  orgId: string;
  userId: string;
  action: string;
  prompt: string;
  responseId?: string;
  model?: string;
  tokens?: { prompt: number; completion: number; total: number };
  executionTime?: number;
  files?: string[];
  ip?: string;
  userAgent?: string;
  status: "success" | "failure";
  error?: string;
}

export class AIAuditLogger {
  private costCalculator = new CostCalculator();

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await AiAuditLog.create({
        orgId: entry.orgId,
        userId: entry.userId,
        action: entry.action,
        prompt: entry.prompt.slice(0, 5000),
        responseId: entry.responseId,
        aiModel: entry.model,
        tokens: entry.tokens,
        executionTime: entry.executionTime,
        files: entry.files,
        ip: entry.ip,
        userAgent: entry.userAgent,
        status: entry.status,
        error: entry.error,
      });

      if (entry.status === "success" && entry.tokens) {
        await this.updateUsageLog(entry);
      }
    } catch (err) {
      console.error("Failed to write AI audit log:", err);
    }
  }

  private async updateUsageLog(entry: AuditLogEntry): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cost = this.costCalculator.calculateCost(
        entry.model || "unknown",
        entry.tokens?.prompt || 0,
        entry.tokens?.completion || 0,
      );

      await AiUsageLog.findOneAndUpdate(
        {
          orgId: entry.orgId,
          userId: entry.userId,
          date: today,
          aiModel: entry.model || "unknown",
        },
        {
          $inc: {
            requests: 1,
            promptTokens: entry.tokens?.prompt || 0,
            completionTokens: entry.tokens?.completion || 0,
            totalTokens: entry.tokens?.total || 0,
            estimatedCost: cost,
            executionTimeMs: entry.executionTime || 0,
          },
        },
        { upsert: true, setDefaultsOnInsert: true },
      );
    } catch (err) {
      console.error("Failed to update AI usage log:", err);
    }
  }

  async getAuditLogs(
    orgId: string,
    options: {
      userId?: string;
      action?: string;
      status?: "success" | "failure";
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const { userId, action, status, startDate, endDate, page = 1, limit = 50 } = options;
    const query: Record<string, unknown> = { orgId };

    if (userId) query.userId = userId;
    if (action) query.action = action;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) (query.createdAt as Record<string, unknown>).$gte = startDate;
      if (endDate) (query.createdAt as Record<string, unknown>).$lte = endDate;
    }

    const total = await AiAuditLog.countDocuments(query);
    const data = await AiAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUsageStats(
    orgId: string,
    options: {
      userId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any> {
    const { userId, startDate, endDate } = options;
    const query: Record<string, unknown> = { orgId };

    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) (query.date as Record<string, unknown>).$gte = startDate;
      if (endDate) (query.date as Record<string, unknown>).$lte = endDate;
    }

    const stats = await AiUsageLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: "$requests" },
          totalPromptTokens: { $sum: "$promptTokens" },
          totalCompletionTokens: { $sum: "$completionTokens" },
          totalTokens: { $sum: "$totalTokens" },
          totalCost: { $sum: "$estimatedCost" },
          totalExecutionTime: { $sum: "$executionTimeMs" },
          uniqueUsers: { $addToSet: "$userId" },
        },
      },
    ]);

    const dailyStats = await AiUsageLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          requests: { $sum: "$requests" },
          tokens: { $sum: "$totalTokens" },
          cost: { $sum: "$estimatedCost" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]);

    const topUsers = await AiUsageLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$userId",
          requests: { $sum: "$requests" },
          tokens: { $sum: "$totalTokens" },
        },
      },
      { $sort: { requests: -1 } },
      { $limit: 10 },
    ]);

    const topActions = await AiAuditLog.aggregate([
      { $match: { orgId } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const agg = stats[0] || { totalRequests: 0, totalTokens: 0, totalCost: 0, totalExecutionTime: 0, uniqueUsers: [] };

    return {
      summary: {
        totalRequests: agg.totalRequests,
        totalPromptTokens: agg.totalPromptTokens || 0,
        totalCompletionTokens: agg.totalCompletionTokens || 0,
        totalTokens: agg.totalTokens || 0,
        totalCost: agg.totalCost || 0,
        totalExecutionTime: agg.totalExecutionTime || 0,
        uniqueUsers: agg.uniqueUsers?.length || 0,
        avgResponseTime: agg.totalRequests > 0 ? (agg.totalExecutionTime || 0) / agg.totalRequests : 0,
      },
      dailyStats,
      topUsers,
      topActions,
    };
  }
}
