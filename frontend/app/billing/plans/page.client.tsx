"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2Icon, AlertCircleIcon, Star, Zap, Crown } from "lucide-react";
import { useRouter } from "next/navigation";

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "₹999",
    usdPrice: "$12",
    period: "/month",
    icon: Zap,
    description: "Best for freelancers and small teams",
    features: [
      "Employee Management",
      "Project Management",
      "Task Management",
      "Time Tracking",
      "Attendance",
      "Basic File Management (100 GB)",
      "Team Collaboration",
      "Client Portal",
      "Email Notifications",
      "Mobile Responsive",
      "Basic Reports",
    ],
    limits: ["10 Users", "10 GB Max File Upload"],
  },
  {
    id: "professional",
    name: "Professional",
    price: "₹3,999",
    usdPrice: "$49",
    period: "/month",
    icon: Star,
    popular: true,
    description: "Best for growing companies and agencies",
    features: [
      "Everything in Starter +",
      "Unlimited Projects",
      "Up to 50 Users",
      "1 TB Secure Storage",
      "Advanced File Version Control",
      "File Approval Workflow",
      "External Secure File Sharing",
      "Client Workspace",
      "Organization Dashboard",
      "Team Analytics & Reports",
      "Billing & Invoice Module",
      "Workflow Automation",
      "Role Based Permissions (RBAC)",
      "Social Login (Google, GitHub)",
      "Real-Time Notifications",
      "API Access",
      "Priority Email Support",
    ],
    limits: ["50 Users", "1 TB Storage"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    usdPrice: "Custom",
    period: "",
    icon: Crown,
    description: "Best for large enterprises and organizations",
    features: [
      "Everything in Professional +",
      "Unlimited Users",
      "Unlimited Storage",
      "Multi Organization & Multi Tenant",
      "Single Sign-On (SSO)",
      "2FA Authentication",
      "Audit Logs",
      "Advanced Analytics",
      "White Label Branding",
      "Custom Development",
      "On-Premise Deployment",
      "Dedicated Account Manager",
      "24×7 Priority Support",
      "SLA Guarantee",
    ],
    limits: [],
  },
];

export default function BillingPlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState("trial");

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) { setLoading(false); return; }
        const profileData = await profileRes.json();
        const oid = profileData?.data?.org?.id;
        const plan = profileData?.data?.org?.plan || "trial";
        if (oid) setOrgId(oid);
        setCurrentPlan(plan);
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleUpgrade(planId: string) {
    if (!orgId) return;
    if (planId === "enterprise") {
      window.location.href = "/contact";
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planId, orgId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to create checkout session");
        return;
      }
      const data = await res.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold">Plans & Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Current plan: <span className="font-medium capitalize">{currentPlan}</span>
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${plan.popular ? "ring-2 ring-primary/30 shadow-lg" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white shadow-sm">
                    <Star className="size-3 fill-white" />
                    Most Popular
                  </span>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className={`size-5 ${plan.popular ? "text-amber-500" : "text-muted-foreground"}`} />
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 gap-4">
                <div>
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                  )}
                </div>

                {plan.limits.length > 0 && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Limits</p>
                    {plan.limits.map((limit) => (
                      <p key={limit} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="size-1 rounded-full bg-muted-foreground/50" />
                        {limit}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="size-4 text-green-600 shrink-0 mt-0.5" />
                      <span className={f.startsWith("Everything") ? "font-medium text-muted-foreground" : ""}>{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className="w-full mt-auto"
                  disabled={isCurrent || actionLoading || plan.id === "enterprise"}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrent ? "Current Plan" : plan.id === "enterprise" ? "Contact Sales" : "Subscribe"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
