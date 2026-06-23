import { Document } from "mongoose";
export interface IStatusTransition {
    status: "online" | "break" | "offline";
    timestamp: Date;
}
export interface ISession extends Document {
    userId: string;
    orgId?: string;
    loginTime: Date;
    logoutTime?: Date;
    currentStatus: "online" | "break" | "offline";
    statusTransitions: IStatusTransition[];
    totalBreakDuration: number;
    duration?: number;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Session: import("mongoose").Model<ISession, {}, {}, {}, Document<unknown, {}, ISession, {}, {}> & ISession & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
