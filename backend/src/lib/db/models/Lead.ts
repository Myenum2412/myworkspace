import { Schema, model, Document } from "mongoose";

export interface ILead extends Document {
  id: string;
  orgId: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  source: "website" | "referral" | "social_media" | "email" | "call" | "direct" | "other";
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "converted" | "lost";
  score: number;
  assignedTo?: string;
  tags: string[];
  notes?: string;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<ILead>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: String,
    phone: String,
    source: {
      type: String,
      enum: ["website", "referral", "social_media", "email", "call", "direct", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "proposal", "negotiation", "converted", "lost"],
      default: "new",
    },
    score: { type: Number, default: 0 },
    assignedTo: String,
    tags: [{ type: String }],
    notes: String,
    convertedAt: Date,
  },
  { timestamps: true }
);

leadSchema.index({ orgId: 1, email: 1 }, { unique: true });
leadSchema.index({ orgId: 1, status: 1 });
leadSchema.index({ orgId: 1, assignedTo: 1 });

export const Lead = model<ILead>("Lead", leadSchema);
