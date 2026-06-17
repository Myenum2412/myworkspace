import { Document, Types } from "mongoose";
export interface IOrgMember extends Document {
    orgId: Types.ObjectId;
    userId: Types.ObjectId;
    role: "admin" | "manager" | "member";
    joinedAt: Date;
}
export declare const OrgMember: import("mongoose").Model<IOrgMember, {}, {}, {}, Document<unknown, {}, IOrgMember, {}, {}> & IOrgMember & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
