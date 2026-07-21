import { Schema, model, Document } from "mongoose";

export interface IOrgMfaPolicy extends Document {
  orgId: string;
  enforcement: "optional" | "admin_only" | "privileged_only" | "mandatory";
  privilegedRoles: string[];
  gracePeriodDays: number;
  gracePeriodEndsAt?: Date;
  allowExemption: boolean;
  exemptUserIds: string[];
  requireTrustedDevice: boolean;
  trustDeviceDays: number;
  requireStepUpHours: number;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orgMfaPolicySchema = new Schema<IOrgMfaPolicy>({
  orgId: { type: String, required: true, unique: true, index: true },
  enforcement: {
    type: String,
    enum: ["optional", "admin_only", "privileged_only", "mandatory"],
    default: "optional",
  },
  privilegedRoles: {
    type: [String],
    default: ["org_admin", "members", "manager", "hr", "finance"],
  },
  gracePeriodDays: { type: Number, default: 14 },
  gracePeriodEndsAt: Date,
  allowExemption: { type: Boolean, default: false },
  exemptUserIds: { type: [String], default: [] },
  requireTrustedDevice: { type: Boolean, default: false },
  trustDeviceDays: { type: Number, default: 30 },
  requireStepUpHours: { type: Number, default: 1 },
  updatedBy: String,
}, { timestamps: true });

export const OrgMfaPolicy = model<IOrgMfaPolicy>("OrgMfaPolicy", orgMfaPolicySchema);
