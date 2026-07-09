import { Document } from "mongoose";
export interface IMessage extends Document {
    orgId: string;
    senderId: string;
    createdBy: string;
    teamId?: string;
    conversationId: string;
    content: string;
    messageType: "text" | "system" | "file";
    replyTo?: string;
    readBy: {
        userId: string;
        readAt: Date;
    }[];
    editedAt?: Date;
    createdAt: Date;
}
export declare const Message: import("mongoose").Model<IMessage, {}, {}, {}, Document<unknown, {}, IMessage, {}, {}> & IMessage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
