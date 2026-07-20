import { Schema, model, Document } from "mongoose";

export interface ITeamMember extends Document {
  orgId: string;
  teamId: string;
  userId: string;
  createdBy: string;
  updatedBy?: string;
  role: "team_lead" | "team_staff";
}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    orgId: { type: String, required: true },
    teamId: { type: String, required: true },
    userId: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
    role: { type: String, enum: ["team_lead", "team_staff"], default: "team_staff" },
  },
  { timestamps: true }
);

teamMemberSchema.index({ orgId: 1, teamId: 1, userId: 1 }, { unique: true });

export const TeamMember = model<ITeamMember>("TeamMember", teamMemberSchema);
