import { Schema, model, Document } from "mongoose";

export interface IOrganizationSubscription extends Document {
  id: string;
  orgId: string;
  planId: string;
  planSlug: string;
  status: "active" | "trialing" | "past_due" | "canceled" | "expired" | "pending_change";
  billingCycle: "monthly" | "yearly";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  pendingPlanId?: string;
  pendingChangeType?: "upgrade" | "downgrade" | "renewal";
  metadata?: Record<string, any>;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const orgSubscriptionSchema = new Schema<IOrganizationSubscription>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    planId: { type: String, required: true },
    planSlug: { type: String, required: true },
    status: {
      type: String,
      enum: ["active", "trialing", "past_due", "canceled", "expired", "pending_change"],
      default: "active",
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },
    trialEnd: { type: Date },
    canceledAt: { type: Date },
    pendingPlanId: { type: String },
    pendingChangeType: {
      type: String,
      enum: ["upgrade", "downgrade", "renewal"],
    },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

orgSubscriptionSchema.index({ orgId: 1, status: 1 });
orgSubscriptionSchema.index({ planId: 1 });
orgSubscriptionSchema.index({ status: 1 });

export const OrganizationSubscription = model<IOrganizationSubscription>("OrganizationSubscription", orgSubscriptionSchema);
