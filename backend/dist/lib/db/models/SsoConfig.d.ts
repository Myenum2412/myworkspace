import { Document, Types } from "mongoose";
export interface ISsoConfig extends Document {
    orgId: Types.ObjectId;
    provider: "saml" | "oidc";
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    metadataUrl?: string;
    enabled: boolean;
    createdAt: Date;
}
export declare const SsoConfig: import("mongoose").Model<ISsoConfig, {}, {}, {}, Document<unknown, {}, ISsoConfig, {}, {}> & ISsoConfig & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
