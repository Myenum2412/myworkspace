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

  type: "individual" | "team" | "common" | "upcoming";

  status:
    | "assigned" | "pending" | "in_progress"
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

  // New fields for assignment mode and member status tracking
  assigneeIds?: string[];
  assignmentMode?: "workflow" | "workspace";
  memberStatuses?: {
    userId: string;
    status: string;
    updatedAt: Date;
  }[];

  // Upcoming Task: scheduling
  startDate?: Date;
  scheduledDate?: Date;
  activatedAt?: Date;

  dueDate?: Date;
  isSaved?: boolean;
  isActive?: boolean;

  // Repeat / recurring task fields
  repeatType?: "daily" | "weekly";
  repeatStartDate?: Date;
  repeatEndDate?: Date;
  lastRepeatGeneratedAt?: Date;

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
      enum: ["individual", "team", "common", "upcoming"],
      default: "individual",
      required: true,
    },

    status: {
      type: String,
      enum: [
        "assigned", "pending", "in_progress",
        "completed", "closed", "hold", "cancelled",
        "rejected", "reopened", "submitted", "approved",
        "published", "accepted", "scheduled", "activated",
      ],
      default: "assigned",
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

    assigneeIds: [{ type: String }],
    assignmentMode: { type: String, enum: ["workflow", "workspace"], default: "workspace" },
    memberStatuses: [
      {
        userId: { type: String, required: true },
        status: { type: String, default: "assigned" },
        updatedAt: { type: Date, default: Date.now },
      },
    ],

    startDate: Date,
    scheduledDate: Date,
    activatedAt: Date,

    dueDate: Date,
    isSaved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    repeatType: { type: String, enum: ["daily", "weekly"] },
    repeatStartDate: Date,
    repeatEndDate: Date,
    lastRepeatGeneratedAt: Date,
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

taskSchema.index({ title: "text", description: "text" });
export const Task = model<ITask>("Task", taskSchema);
