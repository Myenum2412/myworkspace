import { Schema, model } from "mongoose";
const teamSchema = new Schema({
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    description: String,
    createdAt: { type: Date, default: Date.now },
});
export const Team = model("Team", teamSchema);
