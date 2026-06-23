import { Schema, model } from "mongoose";
const ssoConfigSchema = new Schema({
    orgId: { type: String, required: true },
    provider: { type: String, enum: ["saml", "oidc"], required: true },
    issuer: String,
    clientId: String,
    clientSecret: String,
    metadataUrl: String,
    enabled: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});
export const SsoConfig = model("SsoConfig", ssoConfigSchema);
