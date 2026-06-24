import { Document } from "mongoose";
export interface INotification extends Document {
    userId: string;
    orgId: string;
    createdBy: string;
    type: "task_assigned" | "task_updated" | "mention" | "invite" | "system" | "comment" | "status_change";
    title: string;
    message?: string;
    read: boolean;
    link?: string;
    metadata?: string;
    createdAt: Date;
}
export declare const Notification: import("mongoose").Model<INotification, {}, {}, {}, Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
