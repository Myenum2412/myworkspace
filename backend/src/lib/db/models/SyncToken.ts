import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface ISyncToken extends Document {
  id: string;
  userId: string;
  connectionId: string;
  calendarId: string;
  syncToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const syncTokenSchema = new Schema<ISyncToken>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    userId: { type: String, required: true, index: true },
    connectionId: { type: String, required: true, index: true },
    calendarId: { type: String, required: true },
    syncToken: { type: String, required: true },
  },
  { timestamps: true }
);

syncTokenSchema.index({ connectionId: 1, calendarId: 1 }, { unique: true });

export const SyncToken = model<ISyncToken>("SyncToken", syncTokenSchema);
