import { Document } from "mongoose";
export interface IMessage extends Document {
    orgId: string;
    senderId: string;
    teamId?: string;
    content: string;
    createdAt: Date;
}
export declare const Message: import("mongoose").Model<IMessage, {}, {}, {}, Document<unknown, {}, IMessage, {}, {}> & IMessage & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
