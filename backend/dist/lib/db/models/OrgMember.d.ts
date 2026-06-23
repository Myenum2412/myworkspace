import { Document } from "mongoose";
export interface IOrgMember extends Document {
    orgId: string;
    userId: string;
    role: "admin" | "manager" | "member";
    joinedAt: Date;
}
export declare const OrgMember: import("mongoose").Model<IOrgMember, {}, {}, {}, Document<unknown, {}, IOrgMember, {}, {}> & IOrgMember & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
