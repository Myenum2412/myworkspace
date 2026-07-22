import { Schema, model, Document } from "mongoose";

export interface IEmailLog extends Document {
  orgId: string;
  userId: string;
  to: string;
  subject: string;
  template: string;
  data: string;
  status: "queued" | "sent" | "delivered" | "opened" | "clicked" | "failed" | "bounced" | "complained";
  provider: "smtp" | "resend";
  providerMessageId?: string;
  deliveryAttempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  openedCount: number;
  clickedUrls: { url: string; clickedAt: Date; count: number }[];
  error?: string;
  correlationId?: string;
  notificationId?: string;
  category: string;
  metadata?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClickedUrlSchema = new Schema(
  {
    url: { type: String, required: true },
    clickedAt: { type: Date, default: Date.now },
    count: { type: Number, default: 1 },
  },
  { _id: false }
);

const emailLogSchema = new Schema<IEmailLog>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    template: { type: String, required: true },
    data: { type: String },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "opened", "clicked", "failed", "bounced", "complained"],
      default: "queued",
      index: true,
    },
    provider: { type: String, enum: ["smtp", "resend"], required: true },
    providerMessageId: String,
    deliveryAttempts: { type: Number, default: 0 },
    lastAttemptAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    openedCount: { type: Number, default: 0 },
    clickedUrls: { type: [ClickedUrlSchema], default: [] },
    error: String,
    correlationId: { type: String },
    notificationId: { type: String, index: true },
    category: { type: String, default: "system" },
    metadata: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

emailLogSchema.index({ orgId: 1, createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ correlationId: 1 });

export const EmailLog = model<IEmailLog>("EmailLog", emailLogSchema);
