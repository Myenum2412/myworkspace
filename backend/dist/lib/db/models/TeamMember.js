import { Schema, model } from "mongoose";
const teamMemberSchema = new Schema({
    teamId: { type: String, required: true },
    userId: { type: String, required: true },
    role: { type: String, enum: ["lead", "member"], default: "member" },
});
export const TeamMember = model("TeamMember", teamMemberSchema);
