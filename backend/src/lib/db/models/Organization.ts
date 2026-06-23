import { Schema, model, Document } from "mongoose";

export interface IOrganization extends Document {
  name: string;
  slug: string;
  logo?: string;
  domain?: string;
  plan: "starter" | "pro" | "enterprise";
  ownerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: String,
    domain: String,
    plan: { type: String, enum: ["starter", "pro", "enterprise"], default: "starter" },
    ownerId: { type: String },
  },
  { timestamps: true }
);

export const Organization = model<IOrganization>("Organization", organizationSchema);
