import { Schema, model, Document, Types } from "mongoose";

export interface IOrgMember extends Document {
  orgId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "admin" | "manager" | "member";
  joinedAt: Date;
}

const orgMemberSchema = new Schema<IOrgMember>({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
  joinedAt: { type: Date, default: Date.now },
});

// Prevent duplicate memberships
orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });

export const OrgMember = model<IOrgMember>("OrgMember", orgMemberSchema);
