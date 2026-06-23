import { Document, Types } from "mongoose";
export interface IOrganization extends Document {
    name: string;
    slug: string;
    logo?: string;
    domain?: string;
    plan: "starter" | "pro" | "enterprise";
    ownerId?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Organization: import("mongoose").Model<IOrganization, {}, {}, {}, Document<unknown, {}, IOrganization, {}, {}> & IOrganization & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
