import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import {
  JOB_STATUSES,
  JOB_PRIORITIES,
  JOB_TYPES,
  SCHEDULE_TYPES,
  JobStatus,
  JobPriority,
  JobType,
  ScheduleType,
  JobPayload,
} from "../types.js";

export interface IScheduledJob extends Document {
  id: string;
  orgId: string;
  userId: string;
  type: JobType;
  priority: JobPriority;
  status: JobStatus;
  payload: JobPayload;
  scheduleType: ScheduleType;
  cronExpression?: string;
  startAt?: Date;
  endAt?: Date;
  intervalMs?: number;
  timezone: string;
  maxRetries: number;
  retryDelayMs: number;
  retryCount: number;
  currentRetryCount: number;
  nextExecutionAt?: Date;
  lastExecutionAt?: Date;
  lastExecutionResult?: string;
  lastError?: string;
  uniqueKey?: string;
  tags: string[];
  createdBy: string;
  updatedBy: string;
  completedAt?: Date;
  cancelledAt?: Date;
  pausedAt?: Date;
  deletedAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const scheduledJobSchema = new Schema<IScheduledJob>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, enum: JOB_TYPES, index: true },
    priority: { type: String, enum: JOB_PRIORITIES, default: "medium", index: true },
    status: { type: String, enum: JOB_STATUSES, default: "pending", index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    scheduleType: { type: String, required: true, enum: SCHEDULE_TYPES },
    cronExpression: String,
    startAt: Date,
    endAt: Date,
    intervalMs: Number,
    timezone: { type: String, default: "UTC" },
    maxRetries: { type: Number, default: 3, min: 0, max: 25 },
    retryDelayMs: { type: Number, default: 60000 },
    retryCount: { type: Number, default: 0 },
    currentRetryCount: { type: Number, default: 0 },
    nextExecutionAt: { type: Date, index: true },
    lastExecutionAt: Date,
    lastExecutionResult: String,
    lastError: String,
    uniqueKey: { type: String, index: true, sparse: true },
    tags: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    completedAt: Date,
    cancelledAt: Date,
    pausedAt: Date,
    deletedAt: Date,
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

scheduledJobSchema.index({ orgId: 1, status: 1, nextExecutionAt: 1 });
scheduledJobSchema.index({ orgId: 1, type: 1, status: 1 });
scheduledJobSchema.index({ orgId: 1, priority: 1, status: 1 });
scheduledJobSchema.index({ userId: 1, status: 1 });
scheduledJobSchema.index({ uniqueKey: 1, orgId: 1 }, { unique: true, sparse: true });
scheduledJobSchema.index({ nextExecutionAt: 1, status: 1, isDeleted: 1 });
scheduledJobSchema.index({ createdAt: -1 });

export const ScheduledJob = model<IScheduledJob>("ScheduledJob", scheduledJobSchema);
