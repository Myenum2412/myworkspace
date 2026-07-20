import { Schema, model, Document } from "mongoose";

export interface ITeam extends Document {
  orgId: string;
  name: string;
  description?: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

teamSchema.index({ name: "text", description: "text" });
export const Team = model<ITeam>("Team", teamSchema);
