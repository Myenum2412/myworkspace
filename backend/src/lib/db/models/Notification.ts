import { Schema, model, Document, Types } from "mongoose";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";
  title: string;
  message?: string;
  read: boolean;
  link?: string;
  metadata?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
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
