import { Schema, model } from "mongoose";
const teamMemberSchema = new Schema({
    orgId: { type: String, required: true },
    teamId: { type: String, required: true },
    userId: { type: String, required: true },
    createdBy: { type: String, required: true },
    role: { type: String, enum: ["lead", "member"], default: "member" },
});
teamMemberSchema.index({ orgId: 1, teamId: 1, userId: 1 }, { unique: true });
export const TeamMember = model("TeamMember", teamMemberSchema);
