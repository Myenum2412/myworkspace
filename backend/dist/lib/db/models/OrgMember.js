import { Schema, model } from "mongoose";
const orgMemberSchema = new Schema({
    orgId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
});
// Prevent duplicate memberships
orgMemberSchema.index({ orgId: 1, userId: 1 }, { unique: true });
export const OrgMember = model("OrgMember", orgMemberSchema);
