import { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserOrgId } from "@/lib/org";
import { PlansDataTable } from "./components/PlansDataTable";

export const metadata: Metadata = {
  title: "Plans Management | OrgMenu",
  description: "Manage subscription plans, limits, and pricing",
};

async function getPlans() {
  try {
    const plans = await db.collection("subscription_plans")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return plans;
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

  const [plans, stats] = await Promise.all([getPlans(), getPlanStats()]);

  // Merge stats into plans
  const plansWithStats = plans.map((plan: any) => {
    const planStats = stats.find((s: any) => s._id === plan.id);
    return {
      ...plan,
      totalOrganizations: planStats?.count || plan.totalOrganizations || 0,
      activeSubscriptions: planStats?.active || plan.activeSubscriptions || 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and configure subscription plans
          </p>
        </div>
      </div>

      <PlansDataTable initialPlans={plansWithStats as any[]} />
    </div>
  );
}
