import { Schema, model, Document } from "mongoose";

export interface ITask extends Document {
  orgId: string;
  teamId?: string;
  assigneeId?: string;
  creatorId: string;
  createdBy: string;
  updatedBy?: string;
  title: string;
  description?: string;
  project?: string;
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    orgId: { type: String, required: true },
    teamId: { type: String },
    assigneeId: { type: String },
    creatorId: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    title: { type: String, required: true },
    description: String,
    project: String,
    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "done", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: Date,
  },
  { timestamps: true }
);

export const Task = model<ITask>("Task", taskSchema);
