import { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { PlansDataTable } from "./components/PlansDataTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Plans Management | OrgMenu",
  description: "Manage subscription plans, assign to organizations, and track subscriptions",
};

interface PlanData {
  _id: string;
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  version: number;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: Array<{ key: string; value: number | string | boolean; label: string }>;
  features: Array<{ key: string; enabled: boolean; label: string }>;
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
}

interface OrgSubscription {
  _id: string;
  id: string;
  orgId: string;
  planId: string;
  planSlug: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  orgName?: string;
  planName?: string;
}

async function getPlans(): Promise<PlanData[]> {
  try {
    const plans = await db.collection("subscription_plans")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return plans as unknown as PlanData[];
  } catch {
    return [];
  }
}

async function getOrganizations() {
  try {
    const orgs = await db.collection(collections.organizations)
      .find({})
      .project({ id: 1, name: 1, plan: 1, subscriptionStatus: 1, ownerId: 1 })
      .sort({ name: 1 })
      .toArray();
    return orgs;
  } catch {
    return [];
  }
}

async function getOrgSubscriptions(): Promise<OrgSubscription[]> {
  try {
    const subs = await db.collection("organization_subscriptions")
      .find({ status: { $in: ["active", "trialing"] } })
      .sort({ createdAt: -1 })
      .toArray();
    return subs as unknown as OrgSubscription[];
  } catch {
    return [];
  }
}

async function getPlanStats() {
  try {
    const subscriptions = await db.collection("organization_subscriptions").aggregate([
      { $group: { _id: "$planId", count: { $sum: 1 }, active: { $sum: { $cond: [{ $in: ["$status", ["active", "trialing"]] }, 1, 0] } } } },
    ]).toArray();
    return subscriptions;
  } catch {
    return [];
  }
}

export default async function PlansPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "org_admin") redirect("/dashboard");

  const [plans, organizations, subscriptions, stats] = await Promise.all([
    getPlans(),
    getOrganizations(),
    getOrgSubscriptions(),
    getPlanStats(),
  ]);

  // Enrich subscriptions with org names and plan names
  const orgMap = new Map(organizations.map((o: any) => [o.id, o.name]));
  const planMap = new Map(plans.map((p: any) => [p.id, p.name]));

  const enrichedSubscriptions = subscriptions.map((sub) => ({
    ...sub,
    orgName: orgMap.get(sub.orgId) || "Unknown",
    planName: planMap.get(sub.planId) || sub.planSlug,
  }));

  // Merge stats into plans
  const plansWithStats = plans.map((plan: any) => {
    const planStats = stats.find((s: any) => s._id === plan.id);
    return {
      ...plan,
      totalOrganizations: planStats?.count || plan.totalOrganizations || 0,
      activeSubscriptions: planStats?.active || plan.activeSubscriptions || 0,
    };
  });

  // Default pricing plans from myworkspace.myenum.in/pricing
  const defaultPlans = [
    {
      id: "free",
      name: "Free",
      slug: "free",
      description: "Try before you buy — no credit card required",
      price: "₹0",
      priceMonthly: 0,
      priceYearly: 0,
      currency: "INR",
      period: "3 days free trial",
      popular: false,
      limits: [
        { key: "storage", value: "1 GB", label: "Storage" },
        { key: "projects", value: 1, label: "Projects" },
        { key: "clients", value: 2, label: "Clients" },
      ],
      features: [
        { key: "basicFeatures", enabled: true, label: "Basic Features" },
        { key: "emailNotifications", enabled: true, label: "Email Notifications" },
      ],
    },
    {
      id: "starter",
      name: "Starter",
      slug: "starter",
      description: "For startups & solopreneurs — quality work without breaking the bank",
      price: "₹5,000",
      priceMonthly: 5000,
      priceYearly: 5000,
      currency: "INR",
      period: "one-time",
      popular: false,
      limits: [
        { key: "projects", value: 50, label: "Projects" },
        { key: "users", value: 15, label: "Staff Users" },
        { key: "storage", value: "500 GB", label: "Storage" },
        { key: "backup", value: "Monthly", label: "Backup" },
        { key: "whatsappTokens", value: "2K", label: "WhatsApp Tokens" },
      ],
      features: [
        { key: "emailNotifications", enabled: true, label: "Email Notifications — Free" },
      ],
    },
    {
      id: "growth",
      name: "Growth",
      slug: "growth",
      description: "For growing SMBs & funded startups — professional edge",
      price: "₹15,000",
      priceMonthly: 15000,
      priceYearly: 15000,
      currency: "INR",
      period: "one-time",
      popular: true,
      limits: [
        { key: "projects", value: 100, label: "Projects" },
        { key: "users", value: 40, label: "Staff Users" },
        { key: "storage", value: "1 TB", label: "Storage" },
        { key: "backup", value: "Weekly", label: "Backup" },
        { key: "whatsappTokens", value: "8K", label: "WhatsApp Tokens" },
      ],
      features: [
        { key: "emailNotifications", enabled: true, label: "Email Notifications — Free" },
      ],
    },
    {
      id: "enterprise",
      name: "Enterprise",
      slug: "enterprise",
      description: "For enterprises & high-growth companies — strategic depth & white-glove execution",
      price: "Contact Us",
      priceMonthly: 0,
      priceYearly: 0,
      currency: "INR",
      period: "custom pricing",
      popular: false,
      limits: [
        { key: "projects", value: "Unlimited", label: "Projects" },
        { key: "users", value: "Unlimited", label: "Staff Users" },
        { key: "storage", value: "Unlimited", label: "Storage" },
        { key: "backup", value: "Daily", label: "Backup" },
        { key: "whatsappTokens", value: "Unlimited", label: "WhatsApp Tokens" },
      ],
      features: [
        { key: "emailNotifications", enabled: true, label: "Email Notifications — Free" },
        { key: "prioritySupport", enabled: true, label: "Priority Support" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans Management</h1>
          <p className="text-muted-foreground">
            Assign plans to organizations and manage subscriptions
          </p>
        </div>
      </div>

      <PlansDataTable
        initialPlans={plansWithStats as any[]}
        defaultPlans={defaultPlans}
        organizations={organizations as any[]}
        subscriptions={enrichedSubscriptions as any[]}
      />
    </div>
  );
}
