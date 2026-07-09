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
    status: "todo" | "in_progress" | "review" | "done" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
    isSaved?: boolean;
    isActive?: boolean;
    fileIds?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export declare const Task: import("mongoose").Model<ITask, {}, {}, {}, Document<unknown, {}, ITask, {}, {}> & ITask & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
