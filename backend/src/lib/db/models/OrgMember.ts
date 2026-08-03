import { Schema, model, Document } from "mongoose";

export interface IOrgMember extends Document {
  orgId: string;
  userId: string;
  role: "org_admin" | "members" | "manager" | "team_leader" | "staffs" | "team_staff" | "hr" | "finance" | "contractors" | "clients" | "guest";
  createdBy: string;
  updatedBy?: string;
  joinedAt: Date;
}

const orgMemberSchema = new Schema<IOrgMember>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["org_admin", "members", "manager", "team_leader", "staffs", "team_staff", "hr", "finance", "contractors", "clients", "guest"], default: "staffs" },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    joinedAt: { type: Date, default: Date.now },
  },
  { collection: "org_members", timestamps: true }
);

orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

export const OrgMember = model<IOrgMember>("OrgMember", orgMemberSchema);
