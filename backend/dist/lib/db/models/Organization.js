import { Schema, model } from "mongoose";
const organizationSchema = new Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: String,
    domain: String,
    plan: { type: String, enum: ["starter", "pro", "enterprise"], default: "starter" },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
export const Organization = model("Organization", organizationSchema);
