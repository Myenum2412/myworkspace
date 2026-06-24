import { Document } from "mongoose";
export interface IActivityLog extends Document {
    orgId: string;
    userId: string;
    createdBy: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: string;
    createdAt: Date;
}
export declare const ActivityLog: import("mongoose").Model<IActivityLog, {}, {}, {}, Document<unknown, {}, IActivityLog, {}, {}> & IActivityLog & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
