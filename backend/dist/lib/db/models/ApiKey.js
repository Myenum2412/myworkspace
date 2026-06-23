import { Schema, model } from "mongoose";
const apiKeySchema = new Schema({
    orgId: { type: String, required: true },
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    lastUsedAt: Date,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now },
});
export const ApiKey = model("ApiKey", apiKeySchema);
