"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock, CreditCard, CheckCircle2, Ban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type BannerState = {
  visible: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  message: string;
  action?: { label: string; href: string };
};

export function SubscriptionStatusBanner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      setBanner(null);
      return;
    }

    const user = session.user as Record<string, unknown>;
    const subStatus = user.subscriptionStatus as string;
    const trialEnd = user.trialEnd as string | null;
    const plan = user.plan as string;

    if (plan === "enterprise") {
      setBanner(null);
      return;
    }

    if (subStatus === "trialing" && trialEnd) {
      const now = Date.now();
      const end = new Date(trialEnd).getTime();
      const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

      if (now >= end) {
        setBanner({
          visible: true,
          label: "Trial Expired",
          icon: AlertCircle,
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-950/30",
          message: "Your free trial has ended. Subscribe to continue using all features.",
          action: { label: "View Plans", href: "/settings" },
        });
      } else if (daysRemaining <= 3) {
        setBanner({
          visible: true,
          label: `Trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}`,
          icon: Clock,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-950/30",
          message: `Your free trial expires in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Subscribe to keep access.`,
          action: { label: "Subscribe Now", href: "/settings" },
        });
      } else {
        setBanner({
          visible: true,
          label: `${daysRemaining} days remaining in your free trial`,
          icon: Clock,
          color: "text-blue-600",
          bg: "bg-blue-50 dark:bg-blue-950/30",
          message: `You have ${daysRemaining} days left in your free trial. No charges until it ends.`,
          action: { label: "View Plans", href: "/settings" },
        });
      }
      return;
    }

    if (subStatus === "active") {
      const periodEnd = user.currentPeriodEnd as string | null;
      if (periodEnd) {
        const daysUntilRenewal = Math.max(0, Math.ceil((new Date(periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        setBanner({
          visible: true,
          label: `Plan: ${plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Active"}`,
          icon: CheckCircle2,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          message: daysUntilRenewal <= 7
            ? `Your plan renews in ${daysUntilRenewal} day${daysUntilRenewal !== 1 ? "s" : ""}.`
            : "Your subscription is active.",
          action: { label: "Manage Billing", href: "/billing" },
        });
      }
      return;
    }

    if (subStatus === "past_due") {
      setBanner({
        visible: true,
        label: "Payment Past Due",
        icon: AlertCircle,
        color: "text-red-600",
        bg: "bg-red-50 dark:bg-red-950/30",
        message: "Your last payment failed. Please update your billing information to continue.",
        action: { label: "Update Billing", href: "/billing" },
      });
      return;
    }

    if (subStatus === "canceled") {
      setBanner({
        visible: true,
        label: "Subscription Canceled",
        icon: Ban,
        color: "text-gray-600",
        bg: "bg-gray-50 dark:bg-gray-800/50",
        message: "Your subscription has been canceled. Subscribe again to regain access.",
        action: { label: "View Plans", href: "/settings" },
      });
      return;
    }
  }, [session, status]);

  if (!banner?.visible || dismissed) return null;

  const Icon = banner.icon;

  return (
    <div className={cn("rounded-sm border p-4 flex items-start gap-3", banner.bg)}>
      <div className={cn("size-8 rounded-sm flex items-center justify-center shrink-0", banner.bg)}>
        <Icon className={cn("size-4", banner.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold", banner.color)}>{banner.label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{banner.message}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {banner.action && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => router.push(banner.action!.href)}
          >
            {banner.action.label}
          </Button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={cn("rounded-sm p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors", banner.color)}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
