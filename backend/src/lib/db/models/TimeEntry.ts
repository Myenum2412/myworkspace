import { Schema, model, Document } from "mongoose";

export interface ITimeEntry extends Document {
  orgId: string;
  userId: string;
  date: Date;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  billable: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<ITimeEntry>(
  {
    orgId: { type: String, required: true },
    userId: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: String,
    endTime: String,
    duration: { type: Number, required: true, default: 0 },
    description: { type: String, default: "" },
    billable: { type: Boolean, default: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

timeEntrySchema.index({ orgId: 1, userId: 1, date: -1 });

export const TimeEntry = model<ITimeEntry>("TimeEntry", timeEntrySchema);
