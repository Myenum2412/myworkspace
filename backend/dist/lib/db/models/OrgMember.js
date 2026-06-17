import { Schema, model } from "mongoose";
const orgMemberSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
});
export const OrgMember = model("OrgMember", orgMemberSchema);
