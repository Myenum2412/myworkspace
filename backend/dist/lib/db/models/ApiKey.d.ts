import { Document } from "mongoose";
export interface IApiKey extends Document {
    orgId: string;
    name: string;
    key: string;
    lastUsedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
}
export declare const ApiKey: import("mongoose").Model<IApiKey, {}, {}, {}, Document<unknown, {}, IApiKey, {}, {}> & IApiKey & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
