import { Schema, model, Document } from "mongoose";

export interface IFollowUp extends Document {
  id: string;
  orgId: string;
  leadId: string;
  type: "email" | "call" | "meeting" | "sms" | "task" | "linkedin_message";
  subject?: string;
  message?: string;
  status: "pending" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
  channel?: string;
  assignedTo?: string;
  dueAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const followUpSchema = new Schema<IFollowUp>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    leadId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["email", "call", "meeting", "sms", "task", "linkedin_message"],
      required: true,
    },
    subject: String,
    message: String,
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    channel: String,
    assignedTo: String,
    dueAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

followUpSchema.index({ orgId: 1, status: 1 });
followUpSchema.index({ leadId: 1, status: 1 });

export const FollowUp = model<IFollowUp>("FollowUp", followUpSchema);
