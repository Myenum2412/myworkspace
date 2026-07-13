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

  // Task type: individual | team | common | upcoming | draft
  type: "individual" | "team" | "common" | "upcoming" | "draft";

  // Unified status across all types
  status:
    | "draft" | "assigned" | "pending" | "in_progress"
    | "completed" | "closed" | "hold" | "cancelled"
    | "rejected" | "reopened" | "submitted" | "approved"
    | "published" | "accepted" | "scheduled" | "activated";

  priority: "low" | "medium" | "high" | "urgent";

  // Common Task: list of user IDs who can see/accept the task
  selectedUserIds?: string[];

  // Team Task: approval flow fields
  submittedAt?: Date;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNote?: string;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;

  // Upcoming Task: scheduling
  startDate?: Date;
  scheduledDate?: Date;
  activatedAt?: Date;

  dueDate?: Date;
  isSaved?: boolean;
  isActive?: boolean;
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

    type: {
      type: String,
      enum: ["individual", "team", "common", "upcoming", "draft"],
      default: "individual",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "draft", "assigned", "pending", "in_progress",
        "completed", "closed", "hold", "cancelled",
        "rejected", "reopened", "submitted", "approved",
        "published", "accepted", "scheduled", "activated",
      ],
      default: "draft",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    selectedUserIds: [{ type: String }],

    submittedAt: Date,
    approvedBy: { type: String },
    approvedAt: Date,
    approvalNote: { type: String, maxlength: 2000 },
    rejectedBy: { type: String },
    rejectedAt: Date,
    rejectionReason: { type: String, maxlength: 2000 },

    startDate: Date,
    scheduledDate: Date,
    activatedAt: Date,

    dueDate: Date,
    isSaved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taskSchema.index({ orgId: 1, type: 1 });
taskSchema.index({ orgId: 1, status: 1 });
taskSchema.index({ orgId: 1, assigneeId: 1 });
taskSchema.index({ orgId: 1, teamId: 1 });
taskSchema.index({ orgId: 1, dueDate: 1 });
taskSchema.index({ orgId: 1, type: 1, status: 1, createdAt: -1 });
taskSchema.index({ assigneeId: 1, createdAt: -1 });
taskSchema.index({ creatorId: 1, createdAt: -1 });
taskSchema.index({ teamId: 1, createdAt: -1 });
taskSchema.index({ "selectedUserIds": 1 });

export const Task = model<ITask>("Task", taskSchema);
