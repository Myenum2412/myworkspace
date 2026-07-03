import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";

export interface IOrganization extends Document {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  domain?: string;
  businessType?: string;
  industry?: string;
  gstNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  companyEmail?: string;
  mobileNumber?: string;
  alternateMobileNumber?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  authorizedPersonName?: string;
  designation?: string;
  authorizedPersonEmail?: string;
  authorizedPersonMobile?: string;
  numberOfEmployees?: number;
  companyDescription?: string;
  plan: "free" | "growth" | "enterprise" | string;
  ownerId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid";
  currentPeriodEnd?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    id: { type: String, required: true, unique: true, default: () => uuid() },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: String,
    domain: String,
    businessType: String,
    industry: String,
    gstNumber: String,
    panNumber: String,
    cinNumber: String,
    companyEmail: String,
    mobileNumber: String,
    alternateMobileNumber: String,
    website: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "India" },
    authorizedPersonName: String,
    designation: String,
    authorizedPersonEmail: String,
    authorizedPersonMobile: String,
    numberOfEmployees: Number,
    companyDescription: String,
    plan: { type: String, enum: ["free", "starter", "growth", "pro", "enterprise"], default: "free" },
    ownerId: { type: String, required: true },
    stripeCustomerId: { type: String, sparse: true, unique: true },
    stripeSubscriptionId: { type: String, sparse: true, unique: true },
    subscriptionStatus: { type: String, enum: ["active", "past_due", "canceled", "incomplete", "incomplete_expired", "trialing", "unpaid"] },
    currentPeriodEnd: Date,
    trialEnd: Date,
  },
  { timestamps: true }
);

export const Organization = model<IOrganization>("Organization", organizationSchema);
