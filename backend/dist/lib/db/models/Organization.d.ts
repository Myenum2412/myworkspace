import { Document } from "mongoose";
export interface IOrganization extends Document {
    id: string;
    name: string;
    slug: string;
    logo?: string;
    domain?: string;
    businessType?: string;
    industry?: string;
    gstNumber?: string;
    panNumber?: string;
    cinNumber?: string;
    companyEmail?: string;
    mobileNumber?: string;
    alternateMobileNumber?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    authorizedPersonName?: string;
    designation?: string;
    authorizedPersonEmail?: string;
    authorizedPersonMobile?: string;
    numberOfEmployees?: number;
    companyDescription?: string;
    plan: "starter" | "pro" | "enterprise";
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Organization: import("mongoose").Model<IOrganization, {}, {}, {}, Document<unknown, {}, IOrganization, {}, {}> & IOrganization & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>;
