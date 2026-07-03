import { Schema, model, Document } from "mongoose";

export interface IExecutionStep {
  stepId: string;
  type: string;
  status: "pending" | "running" | "completed" | "failed";
  input?: any;
  output?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IWorkflowExecution extends Document {
  id: string;
  workflowId: string;
  orgId: string;
  triggeredBy: string;
  status: "running" | "completed" | "failed";
  startedAt: Date;
  completedAt?: Date;
  steps: IExecutionStep[];
  error?: string;
  createdAt: Date;
}

const workflowExecutionSchema = new Schema<IWorkflowExecution>(
  {
    id: { type: String, required: true, unique: true },
    workflowId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    triggeredBy: { type: String, required: true },
    status: {
      type: String,
      enum: ["running", "completed", "failed"],
      default: "running",
    },
    startedAt: { type: Date, required: true },
    completedAt: Date,
    steps: [{
      stepId: { type: String, required: true },
      type: { type: String, required: true },
      status: {
        type: String,
        enum: ["pending", "running", "completed", "failed"],
        default: "pending",
      },
      input: Schema.Types.Mixed,
      output: Schema.Types.Mixed,
      error: String,
      startedAt: Date,
      completedAt: Date,
    }],
    error: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

workflowExecutionSchema.index({ orgId: 1, status: 1 });
workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });

export const WorkflowExecution = model<IWorkflowExecution>("WorkflowExecution", workflowExecutionSchema);
