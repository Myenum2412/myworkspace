import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface ICalendarConnection extends Document {
  id: string;
  userId: string;
  orgId: string;
  provider: "google" | "microsoft";
  accessToken: string; // Encrypted with AES-256-GCM
  refreshToken: string | null; // Encrypted with AES-256-GCM
  tokenExpiry: Date;
  calendarEmail: string;
  calendarName: string;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  syncToken: string | null;
  webhookChannelId: string | null;
  webhookExpiration: Date | null;
  scopes: string[];
  createdAt: Date;
  updatedAt: Date;
}

const calendarConnectionSchema = new Schema<ICalendarConnection>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    userId: { type: String, required: true, index: true },
    orgId: { type: String, required: true, index: true },
    provider: { type: String, enum: ["google", "microsoft"], required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    tokenExpiry: { type: Date, required: true },
    calendarEmail: { type: String, required: true },
    calendarName: { type: String, required: true },
    syncEnabled: { type: Boolean, default: true },
    lastSyncAt: { type: Date },
    syncToken: { type: String },
    webhookChannelId: { type: String },
    webhookExpiration: { type: Date },
    scopes: { type: [String], default: [] },
  },
  { timestamps: true }
);

calendarConnectionSchema.index({ userId: 1, provider: 1 }, { unique: true });
calendarConnectionSchema.index({ orgId: 1, userId: 1 });
calendarConnectionSchema.index({ webhookChannelId: 1 }, { sparse: true });

export const CalendarConnection = model<ICalendarConnection>(
  "CalendarConnection",
  calendarConnectionSchema
);
