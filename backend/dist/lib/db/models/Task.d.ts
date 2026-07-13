import { Document } from "mongoose";
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
    type: "individual" | "team" | "common" | "upcoming" | "draft";
    status: "draft" | "assigned" | "pending" | "in_progress" | "completed" | "closed" | "hold" | "cancelled" | "rejected" | "reopened" | "submitted" | "approved" | "published" | "accepted" | "scheduled" | "activated";
    priority: "low" | "medium" | "high" | "urgent";
    selectedUserIds?: string[];
    submittedAt?: Date;
    approvedBy?: string;
    approvedAt?: Date;
    approvalNote?: string;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    startDate?: Date;
    scheduledDate?: Date;
    activatedAt?: Date;
    dueDate?: Date;
    isSaved?: boolean;
    isActive?: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Task: import("mongoose").Model<ITask, {}, {}, {}, Document<unknown, {}, ITask, {}, {}> & ITask & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
