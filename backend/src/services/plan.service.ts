import { v4 as uuid } from "uuid";
import { SubscriptionPlan, ISubscriptionPlan } from "../lib/db/models/SubscriptionPlan.js";
import { OrganizationSubscription, IOrganizationSubscription } from "../lib/db/models/OrganizationSubscription.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import { logger } from "../lib/logger/index.js";
import mongoose from "mongoose";

// ── Default Limits ──

const DEFAULT_LIMITS = [
  { key: "maxUsers", value: 10, label: "Maximum Users" },
  { key: "maxStorageGB", value: 10, label: "Storage (GB)" },
  { key: "maxWorkspaces", value: 1, label: "Workspaces" },
  { key: "maxProjects", value: 5, label: "Projects" },
  { key: "maxClients", value: 5, label: "Clients" },
  { key: "maxFileSizeMB", value: 100, label: "Max File Size (MB)" },
  { key: "maxAiRequests", value: 100, label: "AI Requests/month" },
  { key: "maxApiRequests", value: 10000, label: "API Requests/month" },
  { key: "maxIntegrations", value: 3, label: "Integrations" },
];

const DEFAULT_FEATURES = [
  { key: "customBranding", enabled: false, label: "Custom Branding" },
  { key: "prioritySupport", enabled: false, label: "Priority Support" },
  { key: "advancedAnalytics", enabled: false, label: "Advanced Analytics" },
  { key: "sso", enabled: false, label: "SSO Authentication" },
  { key: "auditLogs", enabled: false, label: "Audit Logs" },
  { key: "apiAccess", enabled: false, label: "API Access" },
  { key: "webhooks", enabled: false, label: "Webhooks" },
  { key: "exportData", enabled: false, label: "Data Export" },
  { key: "customFields", enabled: false, label: "Custom Fields" },
];

// ── Types ──

export interface CreatePlanInput {
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  currency?: string;
  limits?: Array<{ key: string; value: number | string | boolean; label: string; description?: string }>;
  features?: Array<{ key: string; enabled: boolean; label: string; description?: string }>;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {
  status?: "active" | "inactive" | "archived";
}

// ── Plan CRUD ──

export async function createPlan(input: CreatePlanInput, userId: string): Promise<ISubscriptionPlan> {
  const slug = slugify(input.name);
  const existing = await SubscriptionPlan.findOne({ slug }).lean().exec();
  if (existing) throw new AppError(400, "A plan with this name already exists");

  const plan = await SubscriptionPlan.create({
    id: uuid(),
    name: input.name,
    slug,
    description: input.description || "",
    status: "active",
    version: 1,
    isDefault: false,
    priceMonthly: input.priceMonthly,
    priceYearly: input.priceYearly,
    currency: input.currency || "USD",
    limits: input.limits || DEFAULT_LIMITS,
    features: input.features || DEFAULT_FEATURES,
    createdBy: userId,
    updatedBy: userId,
  });

  await recordAuditLog({
    orgId: "system",
    userId,
    action: "plan.created",
    entityType: "subscription_plan",
    entityId: plan.id,
    description: `Plan "${plan.name}" created`,
    success: true,
  });

  return plan;
}

export async function updatePlan(planId: string, input: UpdatePlanInput, userId: string): Promise<ISubscriptionPlan> {
  const plan = await SubscriptionPlan.findOne({ id: planId }).exec();
  if (!plan) throw new AppError(404, "Plan not found");

  const previousValues: Record<string, any> = {
    name: plan.name,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    limits: plan.limits,
    features: plan.features,
    status: plan.status,
  };

  if (input.name && input.name !== plan.name) {
    plan.name = input.name;
    plan.slug = slugify(input.name);
  }
  if (input.description !== undefined) plan.description = input.description;
  if (input.priceMonthly !== undefined) plan.priceMonthly = input.priceMonthly;
  if (input.priceYearly !== undefined) plan.priceYearly = input.priceYearly;
  if (input.currency) plan.currency = input.currency;
  if (input.limits) plan.limits = input.limits;
  if (input.features) plan.features = input.features;
  if (input.status) plan.status = input.status;
  plan.version = plan.version + 1;
  plan.updatedBy = userId;

  await plan.save();

  await recordAuditLog({
    orgId: "system",
    userId,
    action: "plan.updated",
    entityType: "subscription_plan",
    entityId: planId,
    description: `Plan "${plan.name}" updated to version ${plan.version}`,
    previousValues,
    newValues: {
      name: plan.name,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      limits: plan.limits,
      features: plan.features,
      status: plan.status,
    },
    success: true,
  });

  // Propagate changes to all orgs on this plan
  await propagatePlanChanges(planId, userId);

  return plan;
}

export async function deletePlan(planId: string, userId: string): Promise<void> {
  const plan = await SubscriptionPlan.findOne({ id: planId }).exec();
  if (!plan) throw new AppError(404, "Plan not found");

  // Check if any orgs are using this plan
  const activeSubs = await OrganizationSubscription.countDocuments({ planId, status: { $in: ["active", "trialing"] } });
  if (activeSubs > 0) {
    throw new AppError(400, `Cannot delete plan with ${activeSubs} active subscriptions. Archive it instead.`);
  }

  plan.status = "archived";
  plan.updatedBy = userId;
  await plan.save();

  await recordAuditLog({
    orgId: "system",
    userId,
    action: "plan.archived",
    entityType: "subscription_plan",
    entityId: planId,
    description: `Plan "${plan.name}" archived`,
    success: true,
  });
}

export async function getPlan(planId: string): Promise<ISubscriptionPlan> {
  const plan = await SubscriptionPlan.findOne({ id: planId }).exec();
  if (!plan) throw new AppError(404, "Plan not found");
  return plan;
}

export async function getPlanBySlug(slug: string): Promise<ISubscriptionPlan | null> {
  return SubscriptionPlan.findOne({ slug, status: "active" }).exec();
}

export async function listPlans(options: { status?: string; page?: number; limit?: number } = {}) {
  const { status, page = 1, limit = 50 } = options;
  const filter: Record<string, any> = {};
  if (status) filter.status = status;

  const skip = (page - 1) * limit;
  const [plans, total] = await Promise.all([
    SubscriptionPlan.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
    SubscriptionPlan.countDocuments(filter).exec(),
  ]);

  return {
    data: plans,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ── Plan Propagation ──

async function propagatePlanChanges(planId: string, userId: string): Promise<void> {
  const subs = await OrganizationSubscription.find({ planId, status: { $in: ["active", "trialing"] } }).exec();
  logger.info({ planId, affectedOrgs: subs.length }, "Propagating plan changes");

  for (const sub of subs) {
    await recordAuditLog({
      orgId: sub.orgId,
      userId,
      action: "plan.changes_propagated",
      entityType: "subscription",
      entityId: sub.id,
      description: `Plan changes propagated to organization ${sub.orgId}`,
      success: true,
    });
  }
}

// ── Subscription Management ──

export async function assignPlanToOrg(
  orgId: string,
  planId: string,
  billingCycle: "monthly" | "yearly",
  userId: string,
  reason?: string,
): Promise<IOrganizationSubscription> {
  const plan = await SubscriptionPlan.findOne({ id: planId, status: "active" }).exec();
  if (!plan) throw new AppError(404, "Plan not found or inactive");

  const org = await Organization.findOne({ id: orgId }).exec();
  if (!org) throw new AppError(404, "Organization not found");

  // Check existing subscription
  const existing = await OrganizationSubscription.findOne({ orgId, status: { $in: ["active", "trialing"] } }).exec();

  const now = new Date();
  const periodEnd = billingCycle === "monthly"
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const sub = await OrganizationSubscription.findOneAndUpdate(
    { orgId, status: { $in: ["active", "trialing"] } },
    {
      $set: {
        planId,
        planSlug: plan.slug,
        status: "active",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        pendingPlanId: undefined,
        pendingChangeType: undefined,
        updatedBy: userId,
      },
    },
    { new: true, upsert: true },
  ).exec();

  // Update org plan
  await Organization.updateOne(
    { id: orgId },
    { $set: { plan: plan.slug, subscriptionStatus: "active", currentPeriodEnd: periodEnd } },
  ).exec();

  // Update plan stats
  await updatePlanStats(planId);

  await recordAuditLog({
    orgId,
    userId,
    action: "subscription.assigned",
    entityType: "subscription",
    entityId: sub.id,
    description: `Plan "${plan.name}" assigned to organization (${billingCycle})`,
    previousValues: existing ? { planId: existing.planId, status: existing.status } : undefined,
    newValues: { planId, planSlug: plan.slug, billingCycle, status: "active" },
    success: true,
    metadata: { reason },
  });

  return sub;
}

export async function upgradeOrgPlan(
  orgId: string,
  newPlanId: string,
  userId: string,
  reason?: string,
): Promise<IOrganizationSubscription> {
  const currentSub = await OrganizationSubscription.findOne({ orgId, status: { $in: ["active", "trialing"] } }).exec();
  if (!currentSub) throw new AppError(400, "Organization has no active subscription");

  const newPlan = await SubscriptionPlan.findOne({ id: newPlanId, status: "active" }).exec();
  if (!newPlan) throw new AppError(404, "Target plan not found or inactive");

  const oldPlan = await SubscriptionPlan.findOne({ id: currentSub.planId }).exec();

  // Determine if upgrade or downgrade
  const changeType = newPlan.priceMonthly > (oldPlan?.priceMonthly || 0) ? "upgrade" : "downgrade";

  const now = new Date();

  currentSub.planId = newPlanId;
  currentSub.planSlug = newPlan.slug;
  currentSub.status = "active";
  currentSub.pendingPlanId = undefined;
  currentSub.pendingChangeType = undefined;
  currentSub.updatedBy = userId;
  await currentSub.save();

  // Update org plan
  await Organization.updateOne(
    { id: orgId },
    { $set: { plan: newPlan.slug, subscriptionStatus: "active" } },
  ).exec();

  // Update plan stats
  await updatePlanStats(currentSub.planId);
  if (currentSub.planId !== newPlanId) {
    await updatePlanStats(newPlanId);
  }

  await recordAuditLog({
    orgId,
    userId,
    action: `subscription.${changeType}`,
    entityType: "subscription",
    entityId: currentSub.id,
    description: `Plan changed from "${oldPlan?.name}" to "${newPlan.name}" (${changeType})`,
    previousValues: { planId: currentSub.planId, planSlug: currentSub.planSlug },
    newValues: { planId: newPlanId, planSlug: newPlan.slug },
    success: true,
    metadata: { reason, changeType },
  });

  return currentSub;
}

export async function cancelOrgSubscription(orgId: string, userId: string, reason?: string): Promise<void> {
  const sub = await OrganizationSubscription.findOne({ orgId, status: { $in: ["active", "trialing"] } }).exec();
  if (!sub) throw new AppError(400, "Organization has no active subscription");

  sub.status = "canceled";
  sub.canceledAt = new Date();
  sub.updatedBy = userId;
  await sub.save();

  await Organization.updateOne(
    { id: orgId },
    { $set: { subscriptionStatus: "canceled" } },
  ).exec();

  await updatePlanStats(sub.planId);

  await recordAuditLog({
    orgId,
    userId,
    action: "subscription.canceled",
    entityType: "subscription",
    entityId: sub.id,
    description: "Subscription canceled",
    success: true,
    metadata: { reason },
  });
}

// ── Stats ──

async function updatePlanStats(planId: string): Promise<void> {
  const stats = await OrganizationSubscription.aggregate([
    { $match: { planId } },
    {
      $group: {
        _id: null,
        activeSubscriptions: { $sum: { $cond: [{ $in: ["$status", ["active", "trialing"]] }, 1, 0] } },
        totalOrgs: { $addToSet: "$orgId" },
      },
    },
  ]).exec();

  const activeSubscriptions = stats[0]?.activeSubscriptions || 0;
  const totalOrganizations = stats[0]?.totalOrgs?.length || 0;

  // Count users across orgs on this plan
  const orgIds = stats[0]?.totalOrgs || [];
  const totalUsers = orgIds.length > 0
    ? await OrgMember.countDocuments({ orgId: { $in: orgIds } })
    : 0;

  await SubscriptionPlan.updateOne(
    { id: planId },
    { $set: { activeSubscriptions, totalOrganizations, totalUsers } },
  ).exec();
}

// ── Helpers ──

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}
