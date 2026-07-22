import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { SettingsFormInteractive } from "./settings-form-interactive";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Star,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

const getSettings = cache(async (orgId: string) => {
  try {
    return await db.collection("org_settings").findOne({ orgId });
  } catch {
    return null;
  }
});

const getCurrentSubscription = cache(async (orgId: string) => {
  try {
    const sub = await db.collection(collections.subscriptions).findOne({
      orgId,
      status: { $in: ["active", "trialing"] },
    });
    return sub;
  } catch {
    return null;
  }
});

const getOrganization = cache(async (orgId: string) => {
  try {
    return await db.collection(collections.organizations).findOne({ id: orgId });
  } catch {
    return null;
  }
});

const availablePlans = [
  {
    name: "Starter",
    slug: "starter",
    price: "₹5,000",
    period: "one-time",
    description: "For startups & solopreneurs",
    features: ["50 projects", "15 staff users", "500 GB storage"],
    popular: false,
  },
  {
    name: "Growth",
    slug: "growth",
    price: "₹15,000",
    period: "one-time",
    description: "For growing SMBs & funded startups",
    features: ["100 projects", "40 staff users", "1 TB storage"],
    popular: true,
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    price: "Contact Us",
    period: "custom",
    description: "For enterprises & high-growth companies",
    features: ["Unlimited projects", "Unlimited staff users", "Unlimited storage"],
    popular: false,
  },
];

export default async function SettingsPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const saved = orgId ? await getSettings(orgId) : null;
  const subscription = orgId ? await getCurrentSubscription(orgId) : null;
  const organization = orgId ? await getOrganization(orgId) : null;

  const currentPlan = organization?.plan || "trial";
  const subscriptionStatus = organization?.subscriptionStatus || "trialing";

  const initial = {
    timezone: (saved?.timezone as string) || "UTC",
    dateFormat: (saved?.dateFormat as string) || "DD/MM/YYYY",
    brandName: (saved?.brandName as string) || "",
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
      {/* Plans Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription Plan
            </h2>
            <p className="text-sm text-muted-foreground">
              Current plan: <span className="font-medium capitalize">{currentPlan}</span>
              {subscriptionStatus === "active" && (
                <Badge variant="default" className="ml-2">Active</Badge>
              )}
              {subscriptionStatus === "trialing" && (
                <Badge variant="secondary" className="ml-2">Trial</Badge>
              )}
            </p>
          </div>
          <Link href="/pricing">
            <Button variant="outline" size="sm">
              {currentPlan === "trial" ? "Upgrade Plan" : "Change Plan"}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availablePlans.map((plan) => (
            <Card
              key={plan.slug}
              className={`relative ${currentPlan === plan.slug ? "border-primary ring-2 ring-primary/20" : ""} ${plan.popular ? "border-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-2 py-0.5 text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    Popular
                  </Badge>
                </div>
              )}
              {currentPlan === plan.slug && (
                <div className="absolute -top-2 right-4">
                  <Badge variant="default" className="px-2 py-0.5 text-xs">
                    Current
                  </Badge>
                </div>
              )}
              <CardHeader className={plan.popular || currentPlan === plan.slug ? "pt-6" : ""}>
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <CardDescription className="text-xs">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">{plan.period}</span>
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs">
                      <Check className="h-3 w-3 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className="block">
                  <Button
                    variant={currentPlan === plan.slug ? "default" : plan.popular ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    disabled={currentPlan === plan.slug}
                  >
                    {currentPlan === plan.slug ? "Current Plan" : plan.price === "Contact Us" ? "Contact Sales" : "Select Plan"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Settings Form */}
      <div>
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>
        <SettingsFormInteractive initial={initial} />
      </div>
    </div>
  );
}
