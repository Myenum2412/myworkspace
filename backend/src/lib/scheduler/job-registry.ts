import { JobType, JobPayload } from "./types.js";
import { logger } from "../logger/index.js";

export type JobHandler = (payload: JobPayload, jobId: string, orgId: string, userId: string) => Promise<void>;

const registry = new Map<JobType, JobHandler>();

function register(type: JobType, handler: JobHandler): void {
  if (registry.has(type)) {
    logger.warn({ type }, "Overwriting existing job handler");
  }
  registry.set(type, handler);
  logger.debug({ type }, "Job handler registered");
}

function get(type: JobType): JobHandler | undefined {
  return registry.get(type);
}

function has(type: JobType): boolean {
  return registry.has(type);
}

function getAllTypes(): JobType[] {
  return Array.from(registry.keys());
}

function getAllHandlers(): Map<JobType, JobHandler> {
  return new Map(registry);
}

function clear(): void {
  registry.clear();
  logger.debug("Job handler registry cleared");
}

async function execute(type: JobType, payload: JobPayload, jobId: string, orgId: string, userId: string): Promise<void> {
  const handler = registry.get(type);
  if (!handler) {
    throw new Error(`No handler registered for job type: ${type}`);
  }
  await handler(payload, jobId, orgId, userId);
}

import { JobType as JT } from "./types.js";

export interface SystemJobDefinition {
  name: string;
  type: JT;
  cron: string;
  timeout?: number | false;
  description: string;
}

export const SYSTEM_JOBS: SystemJobDefinition[] = [
  {
    name: "close-stale-sessions",
    type: "session_cleanup",
    cron: "*/15 * * * *",
    description: "Closes sessions inactive for more than 30 minutes",
  },
  {
    name: "session-daily-report",
    type: "system_maintenance",
    cron: "0 0 * * *",
    description: "Logs daily session summary",
  },
  {
    name: "task-due-reminders",
    type: "task_due_reminder",
    cron: "*/30 * * * *",
    description: "Sends due-soon and overdue task notifications",
  },
  {
    name: "cleanup-files",
    type: "file_cleanup",
    cron: "0 */6 * * *",
    description: "Orphaned thumbnails, previews, temp files cleanup",
  },
  {
    name: "daily-task-email-scheduler",
    type: "daily_task_email",
    cron: "0 * * * *",
    description: "Sends daily task summary emails per org",
  },
  {
    name: "notification-hourly-digests",
    type: "notification_digest",
    cron: "*/30 * * * *",
    description: "Processes hourly notification digests",
  },
  {
    name: "notification-daily-digests",
    type: "notification_digest",
    cron: "0 8 * * *",
    description: "Processes daily notification digests",
  },
  {
    name: "notification-weekly-digests",
    type: "notification_digest",
    cron: "0 9 * * 1",
    description: "Processes weekly notification digests",
  },
  {
    name: "notification-unread-reminders",
    type: "notification_digest",
    cron: "0 10,14,18 * * *",
    description: "Reminds users of unread notifications",
  },
  {
    name: "notification-cleanup-expired",
    type: "notification_digest",
    cron: "0 3 * * *",
    description: "Deletes expired notifications",
  },
  {
    name: "notification-process-snoozed",
    type: "notification_digest",
    cron: "*/5 * * * *",
    description: "Reactivates snoozed notifications",
  },
  {
    name: "database-backup",
    type: "backup_scheduled",
    cron: "0 2 * * 0",
    description: "Weekly database backup",
  },
  {
    name: "analytics-aggregation",
    type: "analytics_aggregation",
    cron: "0 4 * * *",
    description: "Daily analytics aggregation",
  },
  {
    name: "log-rotation",
    type: "log_rotation",
    cron: "0 0 * * 0",
    description: "Weekly log rotation",
  },
];

export const jobRegistry = {
  register,
  get,
  has,
  getAllTypes,
  getAllHandlers,
  clear,
  execute,
};
