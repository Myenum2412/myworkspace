import { Schema, model, Document } from "mongoose";

export interface IPlanLimit {
  key: string;
  value: number | string | boolean;
  label: string;
  description?: string;
}

export interface IPlanFeature {
  key: string;
  enabled: boolean;
  label: string;
  description?: string;
}

export interface ISubscriptionPlan extends Document {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive" | "archived";
  version: number;
  isDefault: boolean;

  // Pricing
  priceMonthly: number;
  priceYearly: number;
  currency: string;

  // Limits (dynamic key-value pairs)
  limits: IPlanLimit[];

  // Features (dynamic key-value pairs)
  features: IPlanFeature[];

  // Stats (computed)
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;

  // Metadata
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const planLimitSchema = new Schema<IPlanLimit>({
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  label: { type: String, required: true },
  description: { type: String },
}, { _id: false });

const planFeatureSchema = new Schema<IPlanFeature>({
  key: { type: String, required: true },
  enabled: { type: Boolean, required: true },
  label: { type: String, required: true },
  description: { type: String },
}, { _id: false });

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },
    version: { type: Number, default: 1 },
    isDefault: { type: Boolean, default: false },

    priceMonthly: { type: Number, required: true, default: 0 },
    priceYearly: { type: Number, required: true, default: 0 },
    currency: { type: String, default: "USD" },

    limits: { type: [planLimitSchema], default: [] },
    features: { type: [planFeatureSchema], default: [] },

    totalOrganizations: { type: Number, default: 0 },
    totalUsers: { type: Number, default: 0 },
    activeSubscriptions: { type: Number, default: 0 },

    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ slug: 1 }, { unique: true });
subscriptionPlanSchema.index({ status: 1 });
subscriptionPlanSchema.index({ isDefault: 1 });

export const SubscriptionPlan = model<ISubscriptionPlan>("SubscriptionPlan", subscriptionPlanSchema);
