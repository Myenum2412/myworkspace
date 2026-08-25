export { schedulerHealthService } from "./health.service.js";
export type { JobHandler } from "./job-registry.js";
export { jobRegistry } from "./job-registry.js";
export { schedulerMetricsService } from "./metrics.service.js";
export { JobExecution } from "./models/JobExecution.js";
export { ScheduledJob } from "./models/ScheduledJob.js";
export { schedulerService } from "./scheduler.service.js";
export type {
  CreateJobInput,
  ExecutionChannel,
  JobDefinition,
  JobExecutionResult,
  JobPayload,
  JobPriority,
  JobStatus,
  JobType,
  SchedulerHealth,
  SchedulerStats,
  ScheduleType,
  UpdateJobInput,
} from "./types.js";
export {
  EXECUTION_CHANNELS,
  JOB_PRIORITIES,
  JOB_STATUSES,
  JOB_TYPE_LABELS,
  JOB_TYPES,
  SCHEDULE_TYPES,
} from "./types.js";

import { logger } from "../logger/index.js";
import { schedulerHealthService } from "./health.service.js";
import { jobRegistry } from "./job-registry.js";
import { schedulerMetricsService } from "./metrics.service.js";
import { schedulerService } from "./scheduler.service.js";

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
