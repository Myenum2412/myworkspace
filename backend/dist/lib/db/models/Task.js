import { Schema, model } from "mongoose";
const taskSchema = new Schema({
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
}, { timestamps: true });
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
export const Task = model("Task", taskSchema);
