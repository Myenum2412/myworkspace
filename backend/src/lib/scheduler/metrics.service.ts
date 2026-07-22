import { schedulerService } from "./scheduler.service.js";
import { metricsRegistry } from "../monitoring/index.js";
import { ScheduledJob } from "./models/ScheduledJob.js";
import { JobExecution } from "./models/JobExecution.js";
import { logger } from "../logger/index.js";
import { SchedulerStats } from "./types.js";

class SchedulerMetricsService {
  private aggregationInterval: ReturnType<typeof setInterval> | null = null;

  startAggregation(intervalMs = 60000): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    this.aggregationInterval = setInterval(async () => {
      await this.aggregateMetrics();
    }, intervalMs);

    logger.info({ intervalMs }, "Scheduler metrics aggregation started");
  }

  stopAggregation(): void {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
  }

  private async aggregateMetrics(): Promise<void> {
    try {
      const stats = await schedulerService.getStats();

      metricsRegistry.setGauge("scheduler_jobs_total", { status: "pending" }, stats.pendingJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "running" }, stats.runningJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "completed" }, stats.completedJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "failed" }, stats.failedJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "cancelled" }, stats.cancelledJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "paused" }, stats.pausedJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "retrying" }, stats.retryingJobs);
      metricsRegistry.setGauge("scheduler_jobs_total", { status: "total" }, stats.totalJobs);

      metricsRegistry.setGauge("scheduler_executions_today", {}, stats.executionsToday);
      metricsRegistry.setGauge("scheduler_success_rate", {}, stats.successRate);

      for (const [type, count] of Object.entries(stats.jobsByType)) {
        metricsRegistry.setGauge("scheduler_jobs_by_type", { type }, count);
      }

      for (const [priority, count] of Object.entries(stats.jobsByPriority)) {
        metricsRegistry.setGauge("scheduler_jobs_by_priority", { priority }, count);
      }
    } catch (err: any) {
      logger.error({ err }, "Scheduler metrics aggregation failed");
    }
  }

  async recordJobDuration(type: string, durationMs: number): Promise<void> {
    metricsRegistry.observeHistogram("scheduler_job_duration_ms", { type }, durationMs);
  }

  async recordExecutionResult(type: string, status: string): Promise<void> {
    metricsRegistry.incrementCounter("scheduler_executions_total", { type, status });
  }

  async getDashboardStats(orgId?: string): Promise<SchedulerStats> {
    return schedulerService.getStats(orgId);
  }

  async getExecutionTrend(days = 7): Promise<{ date: string; completed: number; failed: number; total: number }[]> {
    const results: { date: string; completed: number; failed: number; total: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const [completed, failed, total] = await Promise.all([
        JobExecution.countDocuments({
          status: "completed",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
        JobExecution.countDocuments({
          status: "failed",
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
        JobExecution.countDocuments({
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        }),
      ]);

      results.push({
        date: startOfDay.toISOString().split("T")[0],
        completed,
        failed,
        total,
      });
    }

    return results;
  }

  async getTopFailedJobs(limit = 10): Promise<any[]> {
    return ScheduledJob.find({ status: "failed", isDeleted: false })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .select("id orgId type priority retryCount lastError lastExecutionAt")
      .lean();
  }

  async getSlowestJobs(limit = 10): Promise<any[]> {
    return JobExecution.aggregate([
      { $match: { status: "completed", durationMs: { $gt: 0 } } },
      { $sort: { durationMs: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "scheduledjobs",
          localField: "jobId",
          foreignField: "id",
          as: "job",
        },
      },
      { $unwind: { path: "$job", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          jobId: 1,
          type: 1,
          durationMs: 1,
          orgId: 1,
          jobType: "$job.type",
          jobPriority: "$job.priority",
          createdAt: 1,
        },
      },
    ]);
  }

  async getAvgDurationByType(): Promise<{ type: string; avgDurationMs: number; count: number }[]> {
    return JobExecution.aggregate([
      { $match: { status: "completed", durationMs: { $gt: 0 } } },
      {
        $group: {
          _id: "$type",
          avgDurationMs: { $avg: "$durationMs" },
          count: { $sum: 1 },
        },
      },
      { $sort: { avgDurationMs: -1 } },
      {
        $project: {
          _id: 0,
          type: "$_id",
          avgDurationMs: { $round: ["$avgDurationMs", 0] },
          count: 1,
        },
      },
    ]);
  }
}

export const schedulerMetricsService = new SchedulerMetricsService();
