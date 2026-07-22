export { schedulerService } from "./scheduler.service.js";
export { schedulerHealthService } from "./health.service.js";
export { schedulerMetricsService } from "./metrics.service.js";
export { jobRegistry } from "./job-registry.js";
export type { JobHandler } from "./job-registry.js";
export { ScheduledJob } from "./models/ScheduledJob.js";
export { JobExecution } from "./models/JobExecution.js";
export {
  JOB_STATUSES,
  JOB_PRIORITIES,
  JOB_TYPES,
  SCHEDULE_TYPES,
  EXECUTION_CHANNELS,
  JOB_TYPE_LABELS,
} from "./types.js";
export type {
  JobStatus,
  JobPriority,
  JobType,
  ScheduleType,
  ExecutionChannel,
  JobPayload,
  JobDefinition,
  CreateJobInput,
  UpdateJobInput,
  JobExecutionResult,
  SchedulerStats,
  SchedulerHealth,
} from "./types.js";

import { schedulerService } from "./scheduler.service.js";
import { schedulerHealthService } from "./health.service.js";
import { schedulerMetricsService } from "./metrics.service.js";
import { jobRegistry } from "./job-registry.js";
import { logger } from "../logger/index.js";

export async function initializeScheduler(): Promise<void> {
  try {
    await schedulerService.initialize();
    schedulerHealthService.startMonitoring(30000);
    schedulerMetricsService.startAggregation(60000);
    logger.info("Scheduler system fully initialized");
  } catch (err: any) {
    logger.error({ err }, "Failed to initialize scheduler system");
    throw err;
  }
}

export async function shutdownScheduler(): Promise<void> {
  logger.info("Shutting down scheduler system");
  schedulerMetricsService.stopAggregation();
  schedulerHealthService.stopMonitoring();
  await schedulerService.shutdown();
  logger.info("Scheduler system shut down");
}
