import { Schema, model } from "mongoose";
const teamSchema = new Schema({
    orgId: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    createdBy: { type: String, required: true },
    updatedBy: { type: String },
}, { timestamps: true });
export const Team = model("Team", teamSchema);
