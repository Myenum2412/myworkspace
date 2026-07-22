import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { JOB_STATUSES, JobStatus } from "../types.js";

export interface IJobExecution extends Document {
  id: string;
  jobId: string;
  orgId: string;
  userId: string;
  type: string;
  status: JobStatus;
  priority: string;
  trigger: "scheduled" | "manual" | "retry" | "webhook" | "event";
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: string;
  error?: string;
  stackTrace?: string;
  workerId?: string;
  attemptNumber: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const jobExecutionSchema = new Schema<IJobExecution>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    jobId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true, index: true },
    status: { type: String, required: true, enum: JOB_STATUSES },
    priority: { type: String, default: "medium" },
    trigger: {
      type: String,
      enum: ["scheduled", "manual", "retry", "webhook", "event"],
      default: "scheduled",
    },
    startedAt: Date,
    completedAt: Date,
    durationMs: Number,
    result: String,
    error: String,
    stackTrace: String,
    workerId: String,
    attemptNumber: { type: Number, default: 1 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

jobExecutionSchema.index({ jobId: 1, createdAt: -1 });
jobExecutionSchema.index({ orgId: 1, createdAt: -1 });
jobExecutionSchema.index({ orgId: 1, status: 1, createdAt: -1 });
jobExecutionSchema.index({ userId: 1, createdAt: -1 });
jobExecutionSchema.index({ type: 1, status: 1, createdAt: -1 });
jobExecutionSchema.index({ createdAt: -1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const JobExecution = model<IJobExecution>("JobExecution", jobExecutionSchema);
