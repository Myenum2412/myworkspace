"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "Free",
    features: ["Up to 5 team members", "3 projects", "Basic task management", "10 GB storage", "Email support"],
  },
  {
    name: "Growth",
    price: "$79",
    features: ["Up to 50 team members", "Unlimited projects", "Advanced time tracking", "200 GB storage", "Priority support"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    features: ["Unlimited team members", "Unlimited projects", "Unlimited storage", "SSO & SAML", "Dedicated support"],
  },
];

export default function BillingPlansPage() {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState("free");

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) { setLoading(false); return; }
        const profileData = await profileRes.json();
        const oid = profileData?.data?.org?.id;
        const plan = profileData?.data?.org?.plan || "free";
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
    setActionLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/create-checkout", {
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

  const planIds = ["free", "growth", "enterprise"];
  const currentPlanLabel = currentPlan === "starter" ? "free" : currentPlan === "pro" ? "growth" : currentPlan;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <h1 className="text-2xl font-bold">Plans</h1>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        {plans.map((p, i) => {
          const planId = planIds[i];
          const isCurrent = currentPlanLabel === planId;
          return (
            <Card key={p.name}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <p className="text-3xl font-bold">
                  {p.price}
                  {p.price !== "Free" && p.price !== "Custom" && (
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  )}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckIcon className="size-4 text-green-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  disabled={isCurrent || actionLoading || planId === "free"}
                  onClick={() => handleUpgrade(planId)}
                >
                  {isCurrent ? "Current Plan" : planId === "free" ? "Free" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
