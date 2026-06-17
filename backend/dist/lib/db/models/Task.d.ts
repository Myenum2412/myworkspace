import { Document, Types } from "mongoose";
export interface ITask extends Document {
    orgId: Types.ObjectId;
    teamId?: Types.ObjectId;
    assigneeId?: Types.ObjectId;
    creatorId: Types.ObjectId;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "review" | "done" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    dueDate?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Task: import("mongoose").Model<ITask, {}, {}, {}, Document<unknown, {}, ITask, {}, {}> & ITask & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
