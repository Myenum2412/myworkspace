import { Document, Types } from "mongoose";
export interface IActivityLog extends Document {
    orgId: Types.ObjectId;
    userId: Types.ObjectId;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: string;
    createdAt: Date;
}
export declare const ActivityLog: import("mongoose").Model<IActivityLog, {}, {}, {}, Document<unknown, {}, IActivityLog, {}, {}> & IActivityLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
