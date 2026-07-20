import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";

export type BillingPlan = "free" | "starter" | "professional" | "business" | "enterprise";
export type BillingInterval = "monthly" | "yearly";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "paused";

export interface IPlan extends Document {
  id: string;
  name: string;
  key: BillingPlan;
  description: string;
  features: string[];
  limits: Record<string, number>;
  prices: Record<BillingInterval, number>;
  addonsAvailable: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

export interface ISubscription extends Document {
  id: string;
  orgId: string;
  plan: BillingPlan;
  interval: BillingInterval;
  status: SubscriptionStatus;
  trialEndsAt?: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  pauseResumesAt?: Date;
  seats: number;
  addons: string[];
  couponId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInvoice extends Document {
  id: string;
  orgId: string;
  subscriptionId: string;
  number: string;
  amount: number;
  currency: string;
  tax: number;
  total: number;
  status: "draft" | "open" | "paid" | "past_due" | "void" | "refunded";
  lines: { description: string; amount: number; quantity: number }[];
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date;
  paidBy?: string;
  paymentMethod?: string;
  dueDate: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IPaymentMethod extends Document {
  id: string;
  orgId: string;
  type: "card" | "bank" | "paypal" | "crypto";
  last4: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  isDefault: boolean;
  billingDetails: { name: string; email: string; address?: string };
  createdAt: Date;
}

const planSchema = new Schema<IPlan>({
  id: { type: String, required: true, unique: true },
  name: String, key: { type: String, unique: true }, description: String,
  features: [String], limits: { type: Schema.Types.Mixed, default: {} },
  prices: { monthly: Number, yearly: Number },
  addonsAvailable: [String], isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
}, { timestamps: true });

const subscriptionSchema = new Schema<ISubscription>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, unique: true, index: true },
  plan: { type: String, enum: ["free", "starter", "professional", "business", "enterprise"], required: true },
  interval: { type: String, enum: ["monthly", "yearly"], default: "monthly" },
  status: { type: String, enum: ["active", "trialing", "past_due", "canceled", "incomplete", "paused"], default: "active" },
  trialEndsAt: Date,
  currentPeriodStart: { type: Date, default: Date.now },
  currentPeriodEnd: { type: Date, default: () => new Date(Date.now() + 30 * 86400000) },
  canceledAt: Date, pauseResumesAt: Date,
  seats: { type: Number, default: 1 },
  addons: [String], couponId: String,
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const invoiceSchema = new Schema<IInvoice>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  subscriptionId: { type: String, required: true },
  number: { type: String, required: true },
  amount: Number, currency: { type: String, default: "USD" },
  tax: { type: Number, default: 0 }, total: Number,
  status: { type: String, enum: ["draft", "open", "paid", "past_due", "void", "refunded"], default: "draft" },
  lines: [{ description: String, amount: Number, quantity: Number }],
  periodStart: Date, periodEnd: Date,
  paidAt: Date, paidBy: String, paymentMethod: String,
  dueDate: Date, metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const paymentMethodSchema = new Schema<IPaymentMethod>({
  id: String, orgId: { type: String, required: true, index: true },
  type: { type: String, enum: ["card", "bank", "paypal", "crypto"], required: true },
  last4: String, brand: String, expMonth: Number, expYear: Number,
  isDefault: { type: Boolean, default: false },
  billingDetails: { name: String, email: String, address: String },
}, { timestamps: true });

export const Plan = model<IPlan>("Plan", planSchema);
export const Subscription = model<ISubscription>("Subscription", subscriptionSchema);
export const Invoice = model<IInvoice>("Invoice", invoiceSchema);
export const PaymentMethod = model<IPaymentMethod>("PaymentMethod", paymentMethodSchema);

export class BillingEngine {
  async seedPlans(): Promise<void> {
    const plans = [
      { key: "free", name: "Free", description: "For individuals", sortOrder: 0, features: ["1 project", "100 MB storage", "5 tasks"], prices: { monthly: 0, yearly: 0 }, limits: { projects: 1, storageMB: 100, tasks: 5, members: 1 }, addonsAvailable: [] },
      { key: "starter", name: "Starter", description: "For small teams", sortOrder: 1, features: ["10 projects", "5 GB storage", "Unlimited tasks", "5 team members"], prices: { monthly: 19, yearly: 190 }, limits: { projects: 10, storageGB: 5, tasks: -1, members: 5 }, addonsAvailable: ["extra_storage"] },
      { key: "professional", name: "Professional", description: "For growing businesses", sortOrder: 2, features: ["50 projects", "50 GB storage", "Unlimited tasks", "20 team members", "API access", "Webhooks"], prices: { monthly: 49, yearly: 490 }, limits: { projects: 50, storageGB: 50, tasks: -1, members: 20 }, addonsAvailable: ["extra_storage", "extra_members", "analytics"] },
      { key: "business", name: "Business", description: "For scaling organizations", sortOrder: 3, features: ["Unlimited projects", "500 GB storage", "Unlimited tasks", "100 team members", "API access", "Webhooks", "SSO", "Audit logs", "Priority support"], prices: { monthly: 149, yearly: 1490 }, limits: { projects: -1, storageGB: 500, tasks: -1, members: 100 }, addonsAvailable: ["extra_storage", "extra_members", "analytics", "sla"] },
      { key: "enterprise", name: "Enterprise", description: "For large organizations", sortOrder: 4, features: ["Unlimited everything", "Custom storage", "Unlimited members", "API & Webhooks", "SSO/SAML", "Audit logs", "Dedicated support", "SLA guarantees", "Custom integrations", "White-label"], prices: { monthly: 499, yearly: 4990 }, limits: { projects: -1, storageGB: -1, tasks: -1, members: -1 }, addonsAvailable: ["extra_storage", "analytics", "sla", "white_label"] },
    ];
    for (const p of plans) {
      await Plan.findOneAndUpdate({ key: p.key }, { $set: { ...p, id: uuid(), isActive: true } }, { upsert: true });
    }
  }

  async createSubscription(orgId: string, plan: BillingPlan, interval: BillingInterval): Promise<ISubscription> {
    const existing = await Subscription.findOne({ orgId }).lean();
    if (existing) {
      return Subscription.findOneAndUpdate(
        { orgId }, { $set: { plan, interval, status: "active" } }, { new: true },
      ) as any;
    }
    return Subscription.create({
      id: uuid(), orgId, plan, interval, status: "active",
      currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + (interval === "yearly" ? 365 : 30) * 86400000),
      seats: 1, addons: [],
    });
  }

  async changePlan(orgId: string, newPlan: BillingPlan): Promise<ISubscription> {
    const sub = await Subscription.findOne({ orgId });
    if (!sub) throw new Error("No subscription found");
    sub.plan = newPlan;
    sub.metadata = { ...sub.metadata, previousPlan: sub.plan, changedAt: new Date().toISOString() };
    await sub.save();
    return sub;
  }

  async cancelSubscription(orgId: string): Promise<void> {
    await Subscription.findOneAndUpdate({ orgId }, { $set: { status: "canceled", canceledAt: new Date() } });
  }

  async generateInvoice(orgId: string): Promise<IInvoice> {
    const sub = await Subscription.findOne({ orgId }).lean();
    if (!sub) throw new Error("No active subscription");
    const plan = await Plan.findOne({ key: sub.plan }).lean();
    const price = plan ? plan.prices[sub.interval] : 0;
    const count = await Invoice.countDocuments({});
    const invoice = await Invoice.create({
      id: uuid(), orgId, subscriptionId: sub.id,
      number: `INV-${String(count + 1).padStart(6, "0")}`,
      amount: price * sub.seats, currency: "USD",
      tax: Math.round(price * sub.seats * 0.08),
      total: Math.round(price * sub.seats * 1.08),
      lines: [{ description: `${plan?.name || sub.plan} - ${sub.interval}`, amount: price * sub.seats, quantity: sub.seats }],
      periodStart: sub.currentPeriodStart, periodEnd: sub.currentPeriodEnd,
      status: "open", dueDate: new Date(Date.now() + 30 * 86400000),
    });
    return invoice;
  }

  async markInvoicePaid(invoiceId: string, paymentMethod?: string): Promise<void> {
    await Invoice.findOneAndUpdate(
      { id: invoiceId },
      { $set: { status: "paid", paidAt: new Date(), paymentMethod } },
    );
  }

  async getSubscriptionSummary(orgId: string): Promise<{
    plan: BillingPlan; status: SubscriptionStatus; interval: BillingInterval;
    seats: number; amount: number; nextBillingDate: Date;
    paymentMethods: IPaymentMethod[];
    recentInvoices: IInvoice[];
  }> {
    const [sub, paymentMethods, invoices] = await Promise.all([
      Subscription.findOne({ orgId }).lean() as any,
      PaymentMethod.find({ orgId }).sort({ isDefault: -1 }).lean() as any,
      Invoice.find({ orgId }).sort({ createdAt: -1 }).limit(12).lean() as any,
    ]);
    const plan = await Plan.findOne({ key: sub?.plan || "free" }).lean() as any;
    return {
      plan: sub?.plan || "free", status: sub?.status || "active",
      interval: sub?.interval || "monthly", seats: sub?.seats || 1,
      amount: plan ? plan.prices[sub?.interval || "monthly"] * (sub?.seats || 1) : 0,
      nextBillingDate: sub?.currentPeriodEnd || new Date(),
      paymentMethods: paymentMethods || [],
      recentInvoices: invoices || [],
    };
  }

  async getRevenueReport(): Promise<{
    totalRevenue: number; monthlyRecurring: number; activeSubscriptions: number;
    byPlan: Record<string, number>; conversionRate: number;
  }> {
    const [invoices, subs, totalOrgs] = await Promise.all([
      Invoice.find({ status: "paid" }).lean(),
      Subscription.find({}).lean(),
      Subscription.countDocuments({}),
    ]);
    const totalRevenue = invoices.reduce((s, i) => s + (i.total || 0), 0);
    const paidSubs = subs.filter(s => s.status === "active" || s.status === "trialing");
    const monthlyRecurring = paidSubs.reduce((s, sub) => s + 50, 0);
    const byPlan: Record<string, number> = {};
    for (const s of subs) byPlan[s.plan] = (byPlan[s.plan] || 0) + 1;
    return {
      totalRevenue, monthlyRecurring,
      activeSubscriptions: subs.filter(s => s.status === "active").length,
      byPlan, conversionRate: totalOrgs > 0 ? Math.round((subs.filter(s => s.plan !== "free").length / totalOrgs) * 100) : 0,
    };
  }
}

export const billingEngine = new BillingEngine();
