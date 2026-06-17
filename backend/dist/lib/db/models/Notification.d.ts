import { Document, Types } from "mongoose";
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
export declare const Notification: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
