import { Schema, model, Document } from "mongoose";

export interface IWorkflowStep {
  id: string;
  type: string;
  label: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface IWorkflowTrigger {
  id: string;
  type: string;
  config: Record<string, any>;
}

export interface IWorkflow extends Document {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  status: "active" | "inactive" | "draft";
  steps: IWorkflowStep[];
  triggers: IWorkflowTrigger[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const workflowSchema = new Schema<IWorkflow>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: String,
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "draft",
    },
    steps: [{
      id: { type: String, required: true },
      type: { type: String, required: true },
      label: { type: String, required: true },
      config: { type: Schema.Types.Mixed, default: {} },
      position: {
        x: Number,
        y: Number,
      },
    }],
    triggers: [{
      id: { type: String, required: true },
      type: { type: String, required: true },
      config: { type: Schema.Types.Mixed, default: {} },
    }],
    tags: [{ type: String }],
  },
  { timestamps: true }
);

workflowSchema.index({ orgId: 1, status: 1 });

export const Workflow = model<IWorkflow>("Workflow", workflowSchema);
