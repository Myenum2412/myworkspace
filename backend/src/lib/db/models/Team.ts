import { Schema, model, Document, Types } from "mongoose";

export interface ITeam extends Document {
  orgId: Types.ObjectId;
  name: string;
  description?: string;
  createdAt: Date;
}

const teamSchema = new Schema<ITeam>({
  orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now },
});

export const Team = model<ITeam>("Team", teamSchema);
