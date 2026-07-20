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
  members: string[];
  priority: "low" | "medium" | "high" | "critical";
  category: string;
  budget: number;
  spent: number;
  startDate: Date | null;
  createdBy: string;
  updatedBy?: string;
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
    members: { type: [String], default: [] },
    priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    category: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    startDate: { type: Date, default: null },
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
  },
  { timestamps: true }
);

projectSchema.index({ orgId: 1, createdAt: -1 });
projectSchema.index({ orgId: 1, status: 1 });

projectSchema.index({ name: "text", description: "text" });
export const Project = model<IProject>("Project", projectSchema);
