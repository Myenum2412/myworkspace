export const JOB_STATUSES = ["pending", "running", "completed", "failed", "cancelled", "paused", "retrying"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_PRIORITIES = ["critical", "high", "medium", "low", "background"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const JOB_TYPES = [
  "user_reminder",
  "task_due_reminder",
  "project_deadline_reminder",
  "meeting_reminder",
  "calendar_event_notification",
  "email_scheduled",
  "sms_scheduled",
  "whatsapp_scheduled",
  "push_notification",
  "in_app_notification",
  "daily_recurring",
  "weekly_recurring",
  "monthly_recurring",
  "yearly_recurring",
  "one_time",
  "background_maintenance",
  "database_cleanup",
  "log_rotation",
  "backup_scheduled",
  "report_generation",
  "analytics_aggregation",
  "webhook_retry",
  "queue_retry",
  "workflow_execution",
  "ai_automation",
  "notification_digest",
  "session_cleanup",
  "file_cleanup",
  "thumbnail_generation",
  "metadata_extraction",
  "daily_task_email",
  "system_maintenance",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const SCHEDULE_TYPES = ["cron", "one_time", "recurring", "delayed", "interval", "event_triggered"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const EXECUTION_CHANNELS = ["email", "sms", "whatsapp", "push", "in_app", "webhook", "system"] as const;
export type ExecutionChannel = (typeof EXECUTION_CHANNELS)[number];

export interface JobPayload {
  channel?: ExecutionChannel;
  template?: string;
  subject?: string;
  body?: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface JobDefinition {
  id: string;
  orgId: string;
  userId: string;
  type: JobType;
  priority: JobPriority;
  payload: JobPayload;
  scheduleType: ScheduleType;
  cronExpression?: string;
  startAt?: Date;
  endAt?: Date;
  intervalMs?: number;
  timezone: string;
  maxRetries: number;
  retryDelayMs: number;
  uniqueKey?: string;
  tags?: string[];
  createdBy: string;
  updatedBy: string;
}

export interface CreateJobInput {
  orgId: string;
  userId: string;
  type: JobType;
  priority?: JobPriority;
  payload: JobPayload;
  scheduleType: ScheduleType;
  cronExpression?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  intervalMs?: number;
  timezone?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  uniqueKey?: string;
  tags?: string[];
  createdBy: string;
}

export interface UpdateJobInput {
  type?: JobType;
  priority?: JobPriority;
  payload?: JobPayload;
  scheduleType?: ScheduleType;
  cronExpression?: string;
  startAt?: string | Date;
  endAt?: string | Date;
  intervalMs?: number;
  timezone?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  tags?: string[];
  updatedBy: string;
}

export interface JobExecutionResult {
  jobId: string;
  success: boolean;
  durationMs: number;
  error?: string;
  output?: Record<string, unknown>;
}

export interface SchedulerStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  pausedJobs: number;
  retryingJobs: number;
  executionsToday: number;
  successRate: number;
  avgDurationMs: number;
  jobsByType: Record<string, number>;
  jobsByPriority: Record<string, number>;
}

export interface SchedulerHealth {
  status: "healthy" | "degraded" | "unhealthy";
  breeRunning: boolean;
  mongoConnected: boolean;
  totalJobs: number;
  activeWorkers: number;
  lastHeartbeat: Date | null;
  uptimeSeconds: number;
  memoryUsageMb: number;
  errors: string[];
}

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  user_reminder: "User Reminder",
  task_due_reminder: "Task Due Reminder",
  project_deadline_reminder: "Project Deadline Reminder",
  meeting_reminder: "Meeting Reminder",
  calendar_event_notification: "Calendar Event Notification",
  email_scheduled: "Scheduled Email",
  sms_scheduled: "Scheduled SMS",
  whatsapp_scheduled: "Scheduled WhatsApp",
  push_notification: "Push Notification",
  in_app_notification: "In-App Notification",
  daily_recurring: "Daily Recurring",
  weekly_recurring: "Weekly Recurring",
  monthly_recurring: "Monthly Recurring",
  yearly_recurring: "Yearly Recurring",
  one_time: "One-Time Job",
  background_maintenance: "Background Maintenance",
  database_cleanup: "Database Cleanup",
  log_rotation: "Log Rotation",
  backup_scheduled: "Backup",
  report_generation: "Report Generation",
  analytics_aggregation: "Analytics Aggregation",
  webhook_retry: "Webhook Retry",
  queue_retry: "Queue Retry",
  workflow_execution: "Workflow Execution",
  ai_automation: "AI Automation",
  notification_digest: "Notification Digest",
  session_cleanup: "Session Cleanup",
  file_cleanup: "File Cleanup",
  thumbnail_generation: "Thumbnail Generation",
  metadata_extraction: "Metadata Extraction",
  daily_task_email: "Daily Task Email",
  system_maintenance: "System Maintenance",
};
