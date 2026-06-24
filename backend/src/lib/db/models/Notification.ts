import { Schema, model, Document } from "mongoose";

export interface INotification extends Document {
  userId: string;
  orgId: string;
  createdBy: string;
  type: "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";
  title: string;
  message?: string;
  read: boolean;
  link?: string;
  metadata?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: String, required: true },
  orgId: { type: String, required: true, index: true },
  createdBy: { type: String, required: true },
  type: {
    type: String,
    enum: ["task_assigned", "task_updated", "mention", "invite", "system", "comment", "status_change"],
    required: true,
  },
  title: { type: String, required: true },
  message: String,
  read: { type: Boolean, default: false },
  link: String,
  metadata: String,
  createdAt: { type: Date, default: Date.now },
});

export const Notification = model<INotification>("Notification", notificationSchema);
