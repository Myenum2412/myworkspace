import { Schema, model } from "mongoose";
const teamMemberSchema = new Schema({
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["lead", "member"], default: "member" },
});
export const TeamMember = model("TeamMember", teamMemberSchema);
