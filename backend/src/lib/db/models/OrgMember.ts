import { Schema, model, Document } from "mongoose";

export interface IOrgMember extends Document {
  orgId: string;
  userId: string;
  role: "admin" | "manager" | "member";
  joinedAt: Date;
}

const orgMemberSchema = new Schema<IOrgMember>(
  {
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { collection: "org_members" }
);

orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

export const OrgMember = model<IOrgMember>("OrgMember", orgMemberSchema);
