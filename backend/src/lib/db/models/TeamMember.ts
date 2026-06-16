import { Schema, model, Document, Types } from "mongoose";

export interface ITeamMember extends Document {
  teamId: Types.ObjectId;
  userId: Types.ObjectId;
  role: "lead" | "member";
}

const teamMemberSchema = new Schema<ITeamMember>({
  teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["lead", "member"], default: "member" },
});

export const TeamMember = model<ITeamMember>("TeamMember", teamMemberSchema);
