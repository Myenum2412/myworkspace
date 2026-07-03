"use client";

import { useState } from "react";
import { Label, Pie, PieChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  CreditCardIcon,
  CheckIcon,
  HardDriveIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ZapIcon,
  SparklesIcon,
  Building2Icon,
  AlertCircleIcon,
  CheckCircle2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StorageUsage } from "@/components/storage-usage";
import { priceTiers, getPrice, type Currency } from "@/lib/currency";
import { useUserCountry, isINR } from "@/hooks/use-user-country";

const planIcons: Record<string, typeof ZapIcon> = {
  free: ZapIcon,
  starter: ZapIcon,
  growth: SparklesIcon,
  enterprise: Building2Icon,
};

function formatBytes(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

type SettingsPlansPageInteractiveProps = {
  orgPlan: string;
  orgId: string;
  usedMB: number;
};

export function SettingsPlansPageInteractive({ orgPlan: initialOrgPlan, orgId, usedMB }: SettingsPlansPageInteractiveProps) {
  const [orgPlan, setOrgPlan] = useState<string>(initialOrgPlan);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const { country } = useUserCountry();
  const currency: Currency = isINR(country) ? "INR" : "USD";

  const normalizedPlan = orgPlan === "starter" ? "free" : orgPlan === "pro" ? "growth" : orgPlan;
  const currentTier = priceTiers.find((t) => t.id === normalizedPlan) || priceTiers[0];
  const currentStorageGB = currentTier?.storageGB || 10;
  const totalMB = currentStorageGB * 1024;
  const usedPct = Math.min(100, (usedMB / totalMB) * 100);

  const usedBytes = Math.min(usedMB, totalMB);
  const remainingBytes = Math.max(0, totalMB - usedMB);

  const chartData = [
    { name: "used", value: usedBytes, fill: "var(--color-used)" },
    { name: "free", value: remainingBytes, fill: "var(--color-free)" },
  ];

  const chartConfig = {
    used: { label: "Used", color: "var(--chart-1)" },
    free: { label: "Free", color: "var(--chart-3)" },
  } satisfies ChartConfig;

  async function handleChangePlan(planId: string) {
    if (planId === orgPlan) return;
    setSaving(true);
    setError("");
    setSaved(false);

    const isFree = normalizedPlan === "free";
    const isUpgrade = planId === "growth" || (planId === "enterprise" && isFree);
    const isDowngrade = planId === "free";
    const isEnterprise = planId === "enterprise";

    try {
      if (isEnterprise) {
        setError("Contact our sales team to upgrade to Enterprise.");
        return;
      }

      if (isUpgrade) {
        // Use Stripe Checkout for paid plans
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
        const json = await res.json();
        if (json.data?.url) {
          window.location.href = json.data.url;
        } else {
          setError("Failed to start checkout. Please try again.");
        }
        return;
      }

      if (isDowngrade) {
        // Use Stripe Customer Portal to manage/cancel subscription
        const res = await fetch("/api/billing/portal-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orgId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Failed to open portal");
          return;
        }
        const json = await res.json();
        if (json.data?.url) {
          window.location.href = json.data.url;
        } else {
          setError("No active subscription found. You can change plans directly.");
          // Fallback: direct update if no Stripe subscription
          const fallbackRes = await fetch(`/api/organizations/${orgId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ plan: planId }),
          });
          if (fallbackRes.ok) {
            setOrgPlan(planId);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
          } else {
            const err = await fallbackRes.json().catch(() => ({}));
            setError(err.error || "Failed to update plan");
          }
        }
        return;
      }

      // For other plan changes (e.g. changing between non-paid tiers), update directly
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: planId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to update plan");
        return;
      }
      setOrgPlan(planId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePurchaseStorage() {
    if (orgPlan === "enterprise") return;
    if (orgPlan !== "growth") {
      await handleChangePlan("growth");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCardIcon className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Plans & Billing</h1>
            <p className="text-sm text-muted-foreground">Manage your subscription, plan, and storage</p>
          </div>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-emerald-500">
            <CheckCircle2Icon className="size-4" />
            Saved
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircleIcon className="size-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCardIcon className="size-5" />
            Current Plan
          </CardTitle>
          <CardDescription>You are currently on the <strong>{currentTier.name}</strong> plan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-card/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <CreditCardIcon className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-base font-semibold">{currentTier.name} Plan</p>
                  <p className="text-sm text-muted-foreground">{currentTier.description}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-xs">Active</Badge>
            </div>
          </div>

          {currentTier.features.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Plan Features</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {currentTier.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckIcon className="size-3.5 text-primary shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
        <CardHeader className="items-center pb-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HardDriveIcon className="size-5" />
            Storage Usage
          </CardTitle>
          <CardDescription>
            {formatBytes(usedMB)} used of {currentStorageGB} GB ({usedPct.toFixed(1)}%)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                strokeWidth={5}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {formatBytes(usedMB)}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            of {currentStorageGB} GB used
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-center gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-used)" }} />
              Used: {formatBytes(usedMB)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: "var(--color-free)" }} />
              Free: {formatBytes(Math.max(0, totalMB - usedMB))}
            </span>
          </div>
          {usedPct >= 90 && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              You are running out of storage. Upgrade your plan to get more space.
            </div>
          )}
          {(orgPlan === "free" || orgPlan === "starter") && usedPct >= 70 && (
            <Button variant="outline" size="sm" onClick={handlePurchaseStorage} disabled={saving}>
              <ArrowUpIcon className="size-4 mr-1" />
              Upgrade to Growth for more storage
            </Button>
          )}
        </CardContent>
      </Card>

      <StorageUsage />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SparklesIcon className="size-5" />
            Change Plan
          </CardTitle>
          <CardDescription>Upgrade or downgrade your plan at any time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {priceTiers.map((plan) => {
              const Icon = planIcons[plan.id] || SparklesIcon;
              const isActive = orgPlan === plan.id || (orgPlan === "starter" && plan.id === "free") || (orgPlan === "pro" && plan.id === "growth");
              const price = getPrice(plan, currency);
              const isFree = orgPlan === "free" || orgPlan === "starter";
              const isDowngrade = (plan.id === "free" || plan.id === "starter") && !isFree;
              const isUpgrade = plan.id === "growth" && isFree || plan.id === "enterprise" && orgPlan !== "enterprise";

              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-5 transition-all duration-200",
                    isActive
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/30 hover:shadow-sm",
                    plan.popular && !isActive && "border-primary/30"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <Badge className="text-xs">Most Popular</Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-lg",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{plan.name}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-bold">{price}</span>
                    <span className="text-xs text-muted-foreground">{plan.id === "enterprise" ? "" : "/mo"}</span>
                  </div>

                  <ul className="space-y-1.5 mb-4 flex-1">
                    {plan.features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-start gap-1.5 text-xs">
                        <CheckIcon className="mt-0.5 size-3 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className="text-xs text-muted-foreground">+{plan.features.length - 4} more features</li>
                    )}
                  </ul>

                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="w-full"
                    disabled={isActive || saving}
                    onClick={() => handleChangePlan(plan.id)}
                  >
                    {isActive ? (
                      "Current"
                    ) : isDowngrade ? (
                      <>
                        <ArrowDownIcon className="size-3 mr-1" />
                        Downgrade
                      </>
                    ) : isUpgrade ? (
                      <>
                        <ArrowUpIcon className="size-3 mr-1" />
                        Upgrade
                      </>
                    ) : (
                      "Select"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
