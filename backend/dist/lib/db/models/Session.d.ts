import { Document, Types } from "mongoose";
export interface ISession extends Document {
    userId: Types.ObjectId;
    expiresAt: Date;
    createdAt: Date;
}
export declare const Session: import("mongoose").Model<ISession, {}, {}, {}, Document<unknown, {}, ISession, {}, {}> & ISession & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
