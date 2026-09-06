// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { logger } from "../lib/logger/index.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { schedulerHealthService } from "../lib/scheduler/health.service.js";
import { schedulerMetricsService } from "../lib/scheduler/metrics.service.js";
import { schedulerService } from "../lib/scheduler/scheduler.service.js";
import {
  type CreateJobInput,
  JOB_PRIORITIES,
  JOB_STATUSES,
  JOB_TYPES,
  SCHEDULE_TYPES,
} from "../lib/scheduler/types.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

export default async function plugin(fastify: FastifyInstance) {
function validateCreateBody(body: any): CreateJobInput {
  const errors: string[] = [];

  if (!body.orgId) errors.push("orgId is required");
  if (!body.userId) errors.push("userId is required");
  if (!body.type) errors.push("type is required");
  if (!JOB_TYPES.includes(body.type)) errors.push(`type must be one of: ${JOB_TYPES.join(", ")}`);
  if (!body.scheduleType) errors.push("scheduleType is required");
  if (!SCHEDULE_TYPES.includes(body.scheduleType)) {
    errors.push(`scheduleType must be one of: ${SCHEDULE_TYPES.join(", ")}`);
  }
  if (body.scheduleType === "cron" && !body.cronExpression) {
    errors.push("cronExpression is required for cron schedule type");
  }
  if (body.priority && !JOB_PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${JOB_PRIORITIES.join(", ")}`);
  }
  if (!body.createdBy) errors.push("createdBy is required");

  if (errors.length > 0) {
    throw new AppError(400, `Validation failed: ${errors.join("; ")}`);
  }

  return body as CreateJobInput;
}

fastify.get("/", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const input = validateCreateBody({ ...req.body, orgId });
    const job = await schedulerService.createJob(input);
    reply.send(201).json({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not create job");
  }
});

fastify.get("/bulk", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const inputs: CreateJobInput[] = (req.body.jobs || []).map((j: any) => ({ ...j, orgId }));
    const jobs = await schedulerService.createBulk(inputs);
    reply.send(201).json({ success: true, data: jobs, count: jobs.length });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not create jobs");
  }
});

fastify.get("/", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const result = await schedulerService.listJobs({
      orgId,
      type: req.query.type as any,
      status: req.query.status as any,
      priority: req.query.priority as any,
      tags: req.query.tags ? (req.query.tags as string).split(",") : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 20),
      sortBy: (req.query.sortBy as string) || "createdAt",
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
    });
    reply.send({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not list jobs");
  }
});

fastify.get("/all", async (req: AuthRequest, reply: any) => {
  try {
    await requireOrgMembership(req.user!.userId);
    const isAdmin = isAdminRole(req.user!.role || "");
    const result = await schedulerService.listJobs({
      ...(isAdmin ? {} : { orgId: req.user!.orgId }),
      type: req.query.type as any,
      status: req.query.status as any,
      priority: req.query.priority as any,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 20),
    });
    reply.send({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not list all jobs");
  }
});

fastify.get("/stats", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const stats = await schedulerService.getStats(orgId);
    reply.send({ success: true, data: stats });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get stats");
  }
});

fastify.get("/dashboard", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const [stats, health, trend] = await Promise.all([
      schedulerService.getStats(orgId),
      schedulerService.getHealth(),
      schedulerMetricsService.getExecutionTrend(7),
    ]);
    reply.send({ success: true, data: { stats, health, trend } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get dashboard");
  }
});

fastify.get("/health", async (_req: AuthRequest, reply: any) => {
  try {
    const health = await schedulerService.getHealth();
    const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
    reply.send(statusCode).json({ success: true, data: health });
  } catch (err: any) {
    throw new AppError(500, err.message || "Could not get health");
  }
});

fastify.get("/trends", async (req: AuthRequest, reply: any) => {
  try {
    await requireOrgMembership(req.user!.userId);
    const days = Math.min(90, parseInt(req.query.days as string) || 7);
    const trend = await schedulerMetricsService.getExecutionTrend(days);
    reply.send({ success: true, data: trend });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get trends");
  }
});

fastify.get("/slowest", async (req: AuthRequest, reply: any) => {
  try {
    await requireOrgMembership(req.user!.userId);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const jobs = await schedulerMetricsService.getSlowestJobs(limit);
    reply.send({ success: true, data: jobs });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get slow jobs");
  }
});

fastify.get("/failed-top", async (req: AuthRequest, reply: any) => {
  try {
    await requireOrgMembership(req.user!.userId);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const jobs = await schedulerMetricsService.getTopFailedJobs(limit);
    reply.send({ success: true, data: jobs });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get failed jobs");
  }
});

fastify.get("/avg-duration", async (req: AuthRequest, reply: any) => {
  try {
    await requireOrgMembership(req.user!.userId);
    const avgDuration = await schedulerMetricsService.getAvgDurationByType();
    reply.send({ success: true, data: avgDuration });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get avg duration");
  }
});

fastify.get("/due-count", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const count = await schedulerService.getDueJobsCount(orgId);
    reply.send({ success: true, data: { dueJobs: count } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get due count");
  }
});

fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const job = await schedulerService.getJob(req.params.id, orgId);
    if (!job) {
      throw new AppError(404, "Job not found");
    }
    reply.send({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get job");
  }
});

fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const job = await schedulerService.updateJob(req.params.id, orgId, {
      ...req.body,
      updatedBy: req.user!.userId,
    });
    if (!job) {
      throw new AppError(404, "Job not found or cannot be updated");
    }
    reply.send({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not update job");
  }
});

fastify.get("/:id/pause", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const job = await schedulerService.pauseJob(req.params.id, orgId, req.user!.userId);
    if (!job) {
      throw new AppError(404, "Job not found or cannot be paused");
    }
    reply.send({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not pause job");
  }
});

fastify.get("/:id/resume", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const job = await schedulerService.resumeJob(req.params.id, orgId, req.user!.userId);
    if (!job) {
      throw new AppError(404, "Job not found or cannot be resumed");
    }
    reply.send({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not resume job");
  }
});

fastify.get("/:id/cancel", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const job = await schedulerService.cancelJob(req.params.id, orgId, req.user!.userId);
    if (!job) {
      throw new AppError(404, "Job not found or cannot be cancelled");
    }
    reply.send({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not cancel job");
  }
});

fastify.get("/:id/retry", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const job = await schedulerService.retryJob(req.params.id, orgId, req.user!.userId);
    if (!job) {
      throw new AppError(404, "Job not found or cannot be retried");
    }
    reply.send({ success: true, data: job });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not retry job");
  }
});

fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const success = await schedulerService.deleteJob(req.params.id, orgId, req.user!.userId);
    if (!success) {
      throw new AppError(404, "Job not found");
    }
    reply.send({ success: true, message: "Job deleted" });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not delete job");
  }
});

fastify.get("/:id/hard", async (req: AuthRequest, reply: any) => {
  try {
    await requireOrgMembership(req.user!.userId);
    const isAdmin = isAdminRole(req.user!.role || "");
    if (!isAdmin) {
      throw new AppError(403, "Only admins can hard delete jobs");
    }
    const success = await schedulerService.hardDeleteJob(req.params.id, req.user!.orgId || "");
    if (!success) {
      throw new AppError(404, "Job not found");
    }
    reply.send({ success: true, message: "Job permanently deleted" });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not hard delete job");
  }
});

fastify.get("/:id/executions", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const result = await schedulerService.getJobExecutions({
      jobId: req.params.id,
      orgId,
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(100, parseInt(req.query.limit as string) || 20),
    });
    reply.send({ success: true, ...result });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not get executions");
  }
});

fastify.get("/recover", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const recovered = await schedulerService.recoverFailedJobs(orgId);
    reply.send({ success: true, data: { recovered } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not recover jobs");
  }
});
}
