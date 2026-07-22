import Bree from "bree";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import { env } from "../../config/env.js";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";
import { ScheduledJob, IScheduledJob } from "./models/ScheduledJob.js";
import { JobExecution } from "./models/JobExecution.js";
import { jobRegistry, SYSTEM_JOBS } from "./job-registry.js";
import {
  JobType,
  JobPriority,
  JobStatus,
  ScheduleType,
  CreateJobInput,
  UpdateJobInput,
  JobPayload,
  SchedulerStats,
  SchedulerHealth,
} from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class SchedulerService {
  private bree: Bree | null = null;
  private initialized = false;
  private heartbeatCount = 0;
  private lastHeartbeatAt: Date | null = null;
  private startupTime: Date | null = null;
  private activeWorkerCount = 0;
  private shutdownRequested = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn("Scheduler already initialized");
      return;
    }

    this.startupTime = new Date();
    logger.info("Initializing scheduler service with Bree (JobScheduler.NET)");

    const heartbeatHandler = async () => {
      await this.processHeartbeat();
    };

    this.bree = new Bree({
      logger: false,
      root: false,
      doRootCheck: false,
      defaultExtension: "js",
      timeout: false,
      interval: 0,
      removeCompleted: false,
      errorHandler: (error: unknown, data: any) => {
        logger.error({ err: error, worker: data }, "Bree worker error");
        metricsRegistry.incrementCounter("scheduler_worker_errors_total", {
          worker: data?.name || "unknown",
        });
      },
      workerMessageHandler: (data: any) => {
        logger.debug({ worker: data?.name, message: data?.message }, "Bree worker message");
      },
      jobs: [
        {
          name: "scheduler-heartbeat",
          cron: "* * * * *",
          timeout: false,
          path: heartbeatHandler,
        },
      ],
    });

    this.bree.on("worker created", (name: string) => {
      this.activeWorkerCount++;
      metricsRegistry.incrementCounter("scheduler_workers_created_total", { job: name });
      logger.debug({ job: name }, "Bree worker created");
    });

    this.bree.on("worker deleted", (name: string) => {
      this.activeWorkerCount = Math.max(0, this.activeWorkerCount - 1);
      logger.debug({ job: name }, "Bree worker deleted");
    });

    await this.bree.start();

    await this.seedSystemJobs();

    this.initialized = true;
    logger.info({ systemJobs: SYSTEM_JOBS.length }, "Scheduler initialized with Bree");
  }

  private async seedSystemJobs(): Promise<void> {
    for (const sj of SYSTEM_JOBS) {
      try {
        const existing = await ScheduledJob.findOne({
          uniqueKey: `system:${sj.name}`,
          isDeleted: false,
        }).lean();

        if (!existing) {
          await ScheduledJob.create({
            orgId: "__system__",
            userId: "__system__",
            type: sj.type,
            priority: "medium",
            payload: { metadata: { subType: sj.name } },
            scheduleType: "cron",
            cronExpression: sj.cron,
            timezone: "UTC",
            maxRetries: 2,
            retryDelayMs: 30000,
            uniqueKey: `system:${sj.name}`,
            tags: ["system", sj.type],
            createdBy: "__system__",
            updatedBy: "__system__",
            status: "pending",
            nextExecutionAt: new Date(),
          });
          logger.debug({ name: sj.name, type: sj.type }, "System job registered in MongoDB");
        }
      } catch (err: any) {
        logger.error({ name: sj.name, err }, "Failed to register system job");
      }
    }
  }

  async shutdown(): Promise<void> {
    this.shutdownRequested = true;
    logger.info("Shutting down scheduler");

    if (this.bree) {
      this.bree.stop();
      this.bree = null;
    }

    this.initialized = false;
    logger.info("Scheduler shut down");
  }

  private async processHeartbeat(): Promise<void> {
    if (this.shutdownRequested) return;

    this.heartbeatCount++;
    this.lastHeartbeatAt = new Date();
    metricsRegistry.incrementCounter("scheduler_heartbeats_total");

    const maxLockMinutes = 5;
    const staleThreshold = new Date(Date.now() - maxLockMinutes * 60 * 1000);

    const dueJobs = await ScheduledJob.find({
      status: { $in: ["pending", "retrying"] },
      isDeleted: false,
      nextExecutionAt: { $lte: new Date() },
      $or: [
        { status: "retrying", nextExecutionAt: { $lte: new Date() } },
        { status: "pending" },
      ],
    })
      .sort({ priority: 1, nextExecutionAt: 1 })
      .limit(50)
      .lean();

    for (const job of dueJobs) {
      if (this.shutdownRequested) break;
      await this.executeJob(job).catch((err) => {
        logger.error({ jobId: job.id, type: job.type, err }, "Heartbeat job execution failed");
      });
    }

    const staleRunningJobs = await ScheduledJob.find({
      status: "running",
      isDeleted: false,
      updatedAt: { $lt: staleThreshold },
    }).lean();

    for (const staleJob of staleRunningJobs) {
      logger.warn({ jobId: staleJob.id }, "Recovering stale running job");
      await ScheduledJob.updateOne(
        { id: staleJob.id },
        {
          $set: {
            status: "pending",
            lastError: "Job recovered from stale running state",
          },
        }
      );
    }
  }

  private async executeJob(job: any): Promise<void> {
    const startTime = Date.now();
    const executionId = uuid();

    await ScheduledJob.updateOne(
      { id: job.id },
      { $set: { status: "running", currentRetryCount: job.currentRetryCount || 0 } }
    );

    const execution = new JobExecution({
      id: executionId,
      jobId: job.id,
      orgId: job.orgId,
      userId: job.userId,
      type: job.type,
      status: "running",
      priority: job.priority,
      trigger: job.status === "retrying" ? "retry" : "scheduled",
      startedAt: new Date(),
      attemptNumber: (job.currentRetryCount || 0) + 1,
      metadata: { scheduleType: job.scheduleType, cronExpression: job.cronExpression },
    });

    try {
      await execution.save();

      const handler = jobRegistry.get(job.type as JobType);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      await handler(job.payload as JobPayload, job.id, job.orgId, job.userId);

      const duration = Date.now() - startTime;

      await JobExecution.updateOne(
        { id: executionId },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            durationMs: duration,
            result: "success",
          },
        }
      );

      const updates: any = {
        status: "completed",
        lastExecutionAt: new Date(),
        lastExecutionResult: "success",
        lastError: null,
        completedAt: new Date(),
        currentRetryCount: 0,
      };

      if (job.scheduleType === "one_time" || job.scheduleType === "delayed") {
        updates.nextExecutionAt = null;
      } else if (job.scheduleType === "cron" || job.scheduleType === "interval" || job.scheduleType === "recurring") {
        updates.nextExecutionAt = this.calculateNextExecution(job);
      }

      await ScheduledJob.updateOne({ id: job.id }, { $set: updates });

      metricsRegistry.incrementCounter("scheduler_jobs_completed_total", {
        type: job.type,
        priority: job.priority,
      });
      metricsRegistry.observeHistogram("scheduler_job_duration_ms", { type: job.type }, duration);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const retryCount = (job.currentRetryCount || 0) + 1;
      const maxRetries = job.maxRetries || 3;

      logger.error({ jobId: job.id, type: job.type, attempt: retryCount, err }, "Job execution failed");

      await JobExecution.updateOne(
        { id: executionId },
        {
          $set: {
            status: retryCount >= maxRetries ? "failed" : "failed",
            completedAt: new Date(),
            durationMs: duration,
            error: err.message,
            stackTrace: err.stack,
          },
        }
      );

      if (retryCount < maxRetries) {
        const backoffDelay = this.calculateBackoff(retryCount, job.retryDelayMs || 60000);
        const nextRetry = new Date(Date.now() + backoffDelay);

        await ScheduledJob.updateOne(
          { id: job.id },
          {
            $set: {
              status: "retrying",
              currentRetryCount: retryCount,
              lastExecutionAt: new Date(),
              lastError: err.message,
              nextExecutionAt: nextRetry,
            },
          }
        );

        metricsRegistry.incrementCounter("scheduler_jobs_retried_total", {
          type: job.type,
          attempt: String(retryCount),
        });
      } else {
        await ScheduledJob.updateOne(
          { id: job.id },
          {
            $set: {
              status: "failed",
              currentRetryCount: retryCount,
              lastExecutionAt: new Date(),
              lastError: err.message,
              nextExecutionAt: null,
            },
          }
        );

        metricsRegistry.incrementCounter("scheduler_jobs_failed_total", {
          type: job.type,
        });
      }
    }
  }

  private calculateBackoff(attempt: number, baseDelayMs: number): number {
    const exponential = baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 * exponential;
    return Math.min(exponential + jitter, 24 * 60 * 60 * 1000);
  }

  private calculateNextExecution(job: any): Date | null {
    if (!job.cronExpression && !job.intervalMs) return null;

    if (job.cronExpression) {
      try {
        const later = require("later");
        const schedule = later.parse.cron(job.cronExpression, job.hasSeconds || false);
        const next = later.schedule(schedule).next(1, new Date());
        return next instanceof Date ? next : null;
      } catch {
        try {
          const { CronJob } = require("cron");
          const cronJob = new CronJob(job.cronExpression, () => {});
          return cronJob.nextDate()?.toDate() || null;
        } catch {
          const now = new Date();
          now.setMinutes(now.getMinutes() + 5);
          return now;
        }
      }
    }

    if (job.intervalMs && job.intervalMs > 0) {
      const last = job.lastExecutionAt || new Date();
      return new Date(last.getTime() + job.intervalMs);
    }

    return null;
  }

  async createJob(input: CreateJobInput): Promise<IScheduledJob> {
    const existing = await this.checkDuplicate(input);
    if (existing) {
      logger.info({ uniqueKey: input.uniqueKey, type: input.type }, "Duplicate job prevented");
      return existing;
    }

    const nextExecutionAt = this.computeInitialNextExecution(input);

    const jobData: any = {
      orgId: input.orgId,
      userId: input.userId,
      type: input.type,
      priority: input.priority || "medium",
      payload: input.payload || {},
      scheduleType: input.scheduleType,
      cronExpression: input.cronExpression,
      intervalMs: input.intervalMs,
      timezone: input.timezone || "UTC",
      maxRetries: input.maxRetries ?? 3,
      retryDelayMs: input.retryDelayMs ?? 60000,
      uniqueKey: input.uniqueKey,
      tags: input.tags || [],
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      nextExecutionAt,
    };

    if (input.startAt) {
      jobData.startAt = typeof input.startAt === "string" ? new Date(input.startAt) : input.startAt;
    }
    if (input.endAt) {
      jobData.endAt = typeof input.endAt === "string" ? new Date(input.endAt) : input.endAt;
    }

    const job = await ScheduledJob.create(jobData);
    logger.info({ jobId: job.id, type: job.type }, "Job created");
    return job;
  }

  async createBulk(inputs: CreateJobInput[]): Promise<IScheduledJob[]> {
    const results: IScheduledJob[] = [];
    for (const input of inputs) {
      try {
        const job = await this.createJob(input);
        results.push(job);
      } catch (err: any) {
        logger.error({ type: input.type, err }, "Bulk job creation failed for entry");
      }
    }
    return results;
  }

  private async checkDuplicate(input: CreateJobInput): Promise<IScheduledJob | null> {
    if (!input.uniqueKey) return null;

    const existing = await ScheduledJob.findOne({
      uniqueKey: input.uniqueKey,
      orgId: input.orgId,
      isDeleted: false,
      status: { $nin: ["completed", "cancelled", "failed"] },
    }).lean();

    return existing as IScheduledJob | null;
  }

  private computeInitialNextExecution(input: CreateJobInput): Date | undefined {
    const now = new Date();

    if (input.startAt) {
      const startDate = typeof input.startAt === "string" ? new Date(input.startAt) : input.startAt;
      if (startDate > now) return startDate;
    }

    switch (input.scheduleType) {
      case "one_time":
        return input.startAt ? new Date(input.startAt) : now;
      case "delayed":
        return new Date(now.getTime() + (input.intervalMs || 60000));
      case "cron":
      case "recurring":
      case "interval":
        return now;
      case "event_triggered":
        return undefined;
      default:
        return now;
    }
  }

  async updateJob(jobId: string, orgId: string, input: UpdateJobInput): Promise<IScheduledJob | null> {
    const job = await ScheduledJob.findOne({ id: jobId, orgId, isDeleted: false });
    if (!job) return null;

    const updateData: any = { updatedBy: input.updatedBy };

    if (input.type) updateData.type = input.type;
    if (input.priority) updateData.priority = input.priority;
    if (input.payload) updateData.payload = { ...job.payload, ...input.payload };
    if (input.scheduleType) updateData.scheduleType = input.scheduleType;
    if (input.cronExpression !== undefined) updateData.cronExpression = input.cronExpression;
    if (input.intervalMs !== undefined) updateData.intervalMs = input.intervalMs;
    if (input.timezone) updateData.timezone = input.timezone;
    if (input.maxRetries !== undefined) updateData.maxRetries = input.maxRetries;
    if (input.retryDelayMs !== undefined) updateData.retryDelayMs = input.retryDelayMs;
    if (input.tags) updateData.tags = input.tags;

    if (input.startAt) {
      updateData.startAt = typeof input.startAt === "string" ? new Date(input.startAt) : input.startAt;
    }
    if (input.endAt) {
      updateData.endAt = typeof input.endAt === "string" ? new Date(input.endAt) : input.endAt;
    }

    if (input.scheduleType && ["cron", "recurring", "interval"].includes(input.scheduleType)) {
      const updated = { ...job.toObject(), ...updateData };
      updateData.nextExecutionAt = this.computeNextFromUpdated(updated);
    }

    const updated = await ScheduledJob.findOneAndUpdate(
      { id: jobId },
      { $set: updateData },
      { new: true }
    );

    if (updated) {
      logger.info({ jobId, type: updated.type }, "Job updated");
    }

    return updated;
  }

  private computeNextFromUpdated(job: any): Date {
    if (job.nextExecutionAt && new Date(job.nextExecutionAt) > new Date()) {
      return job.nextExecutionAt;
    }
    return new Date();
  }

  async pauseJob(jobId: string, orgId: string, userId: string): Promise<IScheduledJob | null> {
    return ScheduledJob.findOneAndUpdate(
      { id: jobId, orgId, isDeleted: false, status: { $in: ["pending", "retrying"] } },
      { $set: { status: "paused", pausedAt: new Date(), updatedBy: userId } },
      { new: true }
    );
  }

  async resumeJob(jobId: string, orgId: string, userId: string): Promise<IScheduledJob | null> {
    const job = await ScheduledJob.findOne({ id: jobId, orgId, isDeleted: false, status: "paused" });
    if (!job) return null;

    const nextExecutionAt = job.nextExecutionAt || new Date();
    return ScheduledJob.findOneAndUpdate(
      { id: jobId },
      {
        $set: {
          status: "pending",
          pausedAt: null,
          updatedBy: userId,
          nextExecutionAt,
        },
      },
      { new: true }
    );
  }

  async cancelJob(jobId: string, orgId: string, userId: string): Promise<IScheduledJob | null> {
    return ScheduledJob.findOneAndUpdate(
      { id: jobId, orgId, isDeleted: false, status: { $in: ["pending", "retrying", "paused"] } },
      { $set: { status: "cancelled", cancelledAt: new Date(), updatedBy: userId, nextExecutionAt: null } },
      { new: true }
    );
  }

  async deleteJob(jobId: string, orgId: string, userId: string): Promise<boolean> {
    const result = await ScheduledJob.updateOne(
      { id: jobId, orgId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), updatedBy: userId, status: "cancelled", nextExecutionAt: null } }
    );
    if (result.modifiedCount > 0) {
      logger.info({ jobId }, "Job soft-deleted");
    }
    return result.modifiedCount > 0;
  }

  async hardDeleteJob(jobId: string, orgId: string): Promise<boolean> {
    const result = await ScheduledJob.deleteOne({ id: jobId, orgId });
    if (result.deletedCount > 0) {
      await JobExecution.deleteMany({ jobId });
    }
    return result.deletedCount > 0;
  }

  async getJob(jobId: string, orgId: string): Promise<IScheduledJob | null> {
    return ScheduledJob.findOne({ id: jobId, orgId, isDeleted: false }).lean() as Promise<IScheduledJob | null>;
  }

  async listJobs(params: {
    orgId?: string;
    userId?: string;
    type?: JobType;
    status?: JobStatus;
    priority?: JobPriority;
    tags?: string[];
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ data: IScheduledJob[]; total: number; page: number; totalPages: number }> {
    const { orgId, userId, type, status, priority, tags, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc" } = params;

    const query: any = { isDeleted: false };
    if (orgId) query.orgId = orgId;
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (tags && tags.length > 0) query.tags = { $in: tags };

    const skip = (page - 1) * limit;
    const sortObj: any = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    const [data, total] = await Promise.all([
      ScheduledJob.find(query).sort(sortObj).skip(skip).limit(limit).lean(),
      ScheduledJob.countDocuments(query),
    ]);

    return {
      data: data as unknown as IScheduledJob[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getJobExecutions(params: {
    jobId?: string;
    orgId?: string;
    userId?: string;
    type?: string;
    status?: JobStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const { jobId, orgId, userId, type, status, page = 1, limit = 20 } = params;

    const query: any = {};
    if (jobId) query.jobId = jobId;
    if (orgId) query.orgId = orgId;
    if (userId) query.userId = userId;
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      JobExecution.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      JobExecution.countDocuments(query),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async retryJob(jobId: string, orgId: string, userId: string): Promise<IScheduledJob | null> {
    const job = await ScheduledJob.findOne({ id: jobId, orgId, isDeleted: false, status: "failed" });
    if (!job) return null;

    return ScheduledJob.findOneAndUpdate(
      { id: jobId },
      {
        $set: {
          status: "pending",
          currentRetryCount: 0,
          lastError: null,
          updatedBy: userId,
          nextExecutionAt: new Date(),
        },
      },
      { new: true }
    );
  }

  async recoverFailedJobs(orgId?: string): Promise<number> {
    const query: any = {
      status: { $in: ["failed", "retrying"] },
      isDeleted: false,
    };
    if (orgId) query.orgId = orgId;

    const failedJobs = await ScheduledJob.find(query).lean();
    let recovered = 0;

    for (const job of failedJobs) {
      if (job.currentRetryCount < job.maxRetries) {
        await ScheduledJob.updateOne(
          { id: job.id },
          {
            $set: {
              status: "pending",
              nextExecutionAt: new Date(),
            },
          }
        );
        recovered++;
      }
    }

    logger.info({ recovered, total: failedJobs.length }, "Failed jobs recovery attempted");
    return recovered;
  }

  async getStats(orgId?: string): Promise<SchedulerStats> {
    const match: any = { isDeleted: false };
    if (orgId) match.orgId = orgId;

    const [byStatus, byType, byPriority, executionsToday] = await Promise.all([
      ScheduledJob.aggregate([
        { $match: match },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      ScheduledJob.aggregate([
        { $match: match },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      ScheduledJob.aggregate([
        { $match: match },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      JobExecution.countDocuments({
        ...(orgId ? { orgId } : {}),
        createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) statusMap[s._id] = s.count;

    const jobsByType: Record<string, number> = {};
    for (const t of byType) jobsByType[t._id] = t.count;

    const jobsByPriority: Record<string, number> = {};
    for (const p of byPriority) jobsByPriority[p._id] = p.count;

    const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const completed = statusMap.completed || 0;
    const failed = statusMap.failed || 0;
    const successRate = total > 0 ? (completed / (completed + failed)) * 100 : 100;

    return {
      totalJobs: total,
      pendingJobs: statusMap.pending || 0,
      runningJobs: statusMap.running || 0,
      completedJobs: completed,
      failedJobs: failed,
      cancelledJobs: statusMap.cancelled || 0,
      pausedJobs: statusMap.paused || 0,
      retryingJobs: statusMap.retrying || 0,
      executionsToday,
      successRate,
      avgDurationMs: 0,
      jobsByType,
      jobsByPriority,
    };
  }

  async getHealth(): Promise<SchedulerHealth> {
    const errors: string[] = [];
    let status: SchedulerHealth["status"] = "healthy";

    let mongoConnected = false;
    try {
      mongoConnected = mongoose.connection.readyState === 1;
      if (!mongoConnected) {
        errors.push("MongoDB not connected");
        status = "degraded";
      }
    } catch {
      mongoConnected = false;
      errors.push("MongoDB connection check failed");
      status = "unhealthy";
    }

    const breeRunning = this.bree !== null && this.initialized;
    if (!breeRunning) {
      errors.push("Bree scheduler not running");
      status = "unhealthy";
    }

    const totalJobs = await ScheduledJob.countDocuments({ isDeleted: false });
    const memUsage = process.memoryUsage();
    const uptime = this.startupTime ? Math.floor((Date.now() - this.startupTime.getTime()) / 1000) : 0;

    return {
      status,
      breeRunning,
      mongoConnected,
      totalJobs,
      activeWorkers: this.activeWorkerCount,
      lastHeartbeat: this.lastHeartbeatAt,
      uptimeSeconds: uptime,
      memoryUsageMb: Math.round(memUsage.heapUsed / 1024 / 1024),
      errors,
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getBree(): Bree | null {
    return this.bree;
  }

  getRuntimeStats(): { heartbeatCount: number; lastHeartbeatAt: Date | null; uptimeSeconds: number } {
    return {
      heartbeatCount: this.heartbeatCount,
      lastHeartbeatAt: this.lastHeartbeatAt,
      uptimeSeconds: this.startupTime
        ? Math.floor((Date.now() - this.startupTime.getTime()) / 1000)
        : 0,
    };
  }

  async getDueJobsCount(orgId?: string): Promise<number> {
    const query: any = {
      status: { $in: ["pending", "retrying"] },
      isDeleted: false,
      nextExecutionAt: { $lte: new Date() },
    };
    if (orgId) query.orgId = orgId;
    return ScheduledJob.countDocuments(query);
  }
}

export const schedulerService = new SchedulerService();
