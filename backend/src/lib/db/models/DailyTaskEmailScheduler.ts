import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface IDailyTaskEmailScheduler extends Document {
  id: string;
  orgId: string;
  
  // Global settings
  enabled: boolean;
  paused: boolean;
  
  // Schedule settings
  sendTime: string; // HH:mm format
  timezone: string;
  
  // Day selection (which days to send)
  daysEnabled: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  
  // Recipients
  recipients: "staff" | "users" | "both";
  
  // Email content settings
  includePendingTasks: boolean;
  includeOverdueTasks: boolean;
  includeHighPriorityTasks: boolean;
  includeTodayTasks: boolean;
  includeProjectGrouping: boolean;
  includeTaskLinks: boolean;
  includeCompanyBranding: boolean;
  
  // Stats
  lastSuccessfulRun?: Date;
  lastFailedRun?: Date;
  lastError?: string;
  emailsSentToday: number;
  emailsFailedToday: number;
  totalEmailsSent: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailAuditLog extends Document {
  id: string;
  orgId: string;
  schedulerId: string;
  userId: string;
  userEmail: string;
  status: "queued" | "sent" | "failed" | "retry";
  subject: string;
  taskCount: number;
  pendingCount: number;
  overdueCount: number;
  highPriorityCount: number;
  errorMessage?: string;
  retryCount: number;
  sentAt?: Date;
  createdAt: Date;
}

const dailyTaskEmailSchedulerSchema = new Schema<IDailyTaskEmailScheduler>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    orgId: { type: String, required: true, unique: true, index: true },
    
    enabled: { type: Boolean, default: true },
    paused: { type: Boolean, default: false },
    
    sendTime: { type: String, default: "08:00" },
    timezone: { type: String, default: "UTC" },
    
    daysEnabled: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: false },
      sunday: { type: Boolean, default: false },
    },
    
    recipients: { type: String, enum: ["staff", "users", "both"], default: "both" },
    
    includePendingTasks: { type: Boolean, default: true },
    includeOverdueTasks: { type: Boolean, default: true },
    includeHighPriorityTasks: { type: Boolean, default: true },
    includeTodayTasks: { type: Boolean, default: true },
    includeProjectGrouping: { type: Boolean, default: true },
    includeTaskLinks: { type: Boolean, default: true },
    includeCompanyBranding: { type: Boolean, default: true },
    
    lastSuccessfulRun: Date,
    lastFailedRun: Date,
    lastError: String,
    emailsSentToday: { type: Number, default: 0 },
    emailsFailedToday: { type: Number, default: 0 },
    totalEmailsSent: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const emailAuditLogSchema = new Schema<IEmailAuditLog>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    orgId: { type: String, required: true, index: true },
    schedulerId: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true },
    status: { type: String, enum: ["queued", "sent", "failed", "retry"], default: "queued" },
    subject: { type: String, required: true },
    taskCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    overdueCount: { type: Number, default: 0 },
    highPriorityCount: { type: Number, default: 0 },
    errorMessage: String,
    retryCount: { type: Number, default: 0 },
    sentAt: Date,
  },
  { timestamps: true }
);

emailAuditLogSchema.index({ orgId: 1, createdAt: -1 });
emailAuditLogSchema.index({ userId: 1, createdAt: -1 });
emailAuditLogSchema.index({ schedulerId: 1, createdAt: -1 });

export const DailyTaskEmailScheduler = model<IDailyTaskEmailScheduler>(
  "DailyTaskEmailScheduler",
  dailyTaskEmailSchedulerSchema
);

export const EmailAuditLog = model<IEmailAuditLog>(
  "EmailAuditLog",
  emailAuditLogSchema
);
