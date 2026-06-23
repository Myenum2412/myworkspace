import { Schema, model, Document } from "mongoose";

export interface ITeamMember extends Document {
  teamId: string;
  userId: string;
  role: "lead" | "member";
}

const teamMemberSchema = new Schema<ITeamMember>({
  teamId: { type: String, required: true },
  userId: { type: String, required: true },
  role: { type: String, enum: ["lead", "member"], default: "member" },
});

export const TeamMember = model<ITeamMember>("TeamMember", teamMemberSchema);
