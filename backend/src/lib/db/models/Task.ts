import { Schema, model, Document, Types } from "mongoose";

export interface ITask extends Document {
  orgId: Types.ObjectId;
  teamId?: Types.ObjectId;
  assigneeId?: Types.ObjectId;
  creatorId: Types.ObjectId;
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
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User" },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
