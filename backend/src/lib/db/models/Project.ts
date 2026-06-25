import { Schema, model, Document } from "mongoose";

export interface IProject extends Document {
  id: string;
  orgId: string;
  name: string;
  client: string;
  color: string;
  description: string;
  deadline: Date | null;
  tracked: number;
  progress: number;
  access: "Public" | "Private";
  status: "Active" | "Inactive";
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    client: { type: String, default: "" },
    color: { type: String, default: "#3b82f6" },
    description: { type: String, default: "" },
    deadline: { type: Date, default: null },
    tracked: { type: Number, default: 0 },
    progress: { type: Number, default: 0 },
    access: { type: String, enum: ["Public", "Private"], default: "Public" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
  },
  { timestamps: true }
);

export const Project = model<IProject>("Project", projectSchema);
