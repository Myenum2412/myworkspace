import { Document, Types } from "mongoose";
export interface IMessage extends Document {
    orgId: Types.ObjectId;
    senderId: Types.ObjectId;
    teamId?: Types.ObjectId;
    content: string;
    createdAt: Date;
}
export declare const Message: import("mongoose").Model<IMessage, {}, {}, {}, Document<unknown, {}, IMessage, {}, {}> & IMessage & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
