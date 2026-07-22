"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const EXPIRED_CONFIG = {
  trial: {
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    title: "Your free trial has ended",
    message: "Your 15-day free trial has expired. Choose a plan below to continue using all features.",
  },
  subscription: {
    icon: Ban,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
    title: "Subscription required",
    message: "Your subscription is no longer active. Please select a plan to regain access.",
  },
};

export function PricingExpiredBanner() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired");

  if (!expired || !(expired in EXPIRED_CONFIG)) return null;

  const config = EXPIRED_CONFIG[expired as keyof typeof EXPIRED_CONFIG];
  const Icon = config.icon;

  return (
    <div className={cn("rounded-sm border p-4 flex items-start gap-3 mb-8", config.bg)}>
      <div className={cn("size-10 rounded-sm flex items-center justify-center shrink-0", config.bg)}>
        <Icon className={cn("size-5", config.color)} />
      </div>
      <div>
        <p className={cn("text-base font-semibold", config.color)}>{config.title}</p>
        <p className="text-sm text-muted-foreground mt-1">{config.message}</p>
      </div>
    </div>
  );
}
