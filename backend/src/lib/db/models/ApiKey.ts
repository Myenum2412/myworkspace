import { Schema, model, Document } from "mongoose";

export interface IApiKey extends Document {
  orgId: string;
  name: string;
  key: string;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>({
  orgId: { type: String, required: true },
  name: { type: String, required: true },
  key: { type: String, required: true, unique: true },
  lastUsedAt: Date,
  expiresAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);
