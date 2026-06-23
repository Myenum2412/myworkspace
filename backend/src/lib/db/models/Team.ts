import { Schema, model, Document } from "mongoose";

export interface ITeam extends Document {
  orgId: string;
  name: string;
  description?: string;
  createdAt: Date;
}

const teamSchema = new Schema<ITeam>({
  orgId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
});

export const Team = model<ITeam>("Team", teamSchema);
