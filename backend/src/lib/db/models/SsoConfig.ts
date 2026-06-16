import { Schema, model, Document, Types } from "mongoose";

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

const ssoConfigSchema = new Schema<ISsoConfig>({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  provider: { type: String, enum: ["saml", "oidc"], required: true },
  issuer: String,
  clientId: String,
  clientSecret: String,
  metadataUrl: String,
  enabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export const SsoConfig = model<ISsoConfig>("SsoConfig", ssoConfigSchema);
