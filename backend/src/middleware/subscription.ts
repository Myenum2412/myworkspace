import { Response, NextFunction } from "express";
import { Organization } from "../lib/db/models/Organization.js";
import type { AuthRequest } from "../types/index.js";

export type SubscriptionStatus = {
  hasAccess: boolean;
  plan: string;
  subscriptionStatus: string;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  daysRemaining: number;
  reason?: string;
};

export function getSubscriptionStatus(org: any): SubscriptionStatus {
  const now = new Date();
  const trialEnd = org.trialEnd ? new Date(org.trialEnd) : null;
  const currentPeriodEnd = org.currentPeriodEnd ? new Date(org.currentPeriodEnd) : null;
  const status = org.subscriptionStatus || "none";

  // Trial period
  if (status === "trialing") {
    if (trialEnd && trialEnd > now) {
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return {
        hasAccess: true,
        plan: org.plan || "trial",
        subscriptionStatus: "trialing",
        trialEnd,
        currentPeriodEnd,
        daysRemaining,
      };
    }
    // Trial expired
    return {
      hasAccess: false,
      plan: org.plan || "trial",
      subscriptionStatus: "expired",
      trialEnd,
      currentPeriodEnd,
      daysRemaining: 0,
      reason: "Your free trial has ended. Please subscribe to continue.",
    };
  }

  // Active subscription
  if (status === "active" || status === "trialing") {
    if (currentPeriodEnd && currentPeriodEnd < now) {
      // Period ended but subscription may renew
    }
    return {
      hasAccess: true,
      plan: org.plan || "starter",
      subscriptionStatus: status,
      trialEnd,
      currentPeriodEnd,
      daysRemaining: currentPeriodEnd
        ? Math.max(0, Math.ceil((currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
    };
  }

  // Past due - still grant access but warn
  if (status === "past_due") {
    return {
      hasAccess: true,
      plan: org.plan || "starter",
      subscriptionStatus: "past_due",
      trialEnd,
      currentPeriodEnd,
      daysRemaining: 0,
      reason: "Your payment is past due. Please update your billing information.",
    };
  }

  // Canceled - no access
  if (status === "canceled") {
    return {
      hasAccess: false,
      plan: org.plan || "free",
      subscriptionStatus: status,
      trialEnd,
      currentPeriodEnd,
      daysRemaining: 0,
      reason: "Your subscription is no longer active. Please subscribe to continue.",
    };
  }

  // Free plan / no subscription - no access
  return {
    hasAccess: false,
    plan: org.plan || "free",
    subscriptionStatus: "none",
    trialEnd,
    currentPeriodEnd,
    daysRemaining: 0,
    reason: "Please subscribe to access this feature.",
  };
}

export async function requireSubscription(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  const orgId = req.user.orgId;
  if (!orgId) {
    res.status(403).json({ success: false, error: "No organization found" });
    return;
  }

  try {
    const org = await Organization.findOne({ id: orgId });
    if (!org) {
      res.status(404).json({ success: false, error: "Organization not found" });
      return;
    }

    const status = getSubscriptionStatus(org);
    if (!status.hasAccess) {
      res.status(403).json({
        success: false,
        error: status.reason || "No active subscription",
        code: "SUBSCRIPTION_REQUIRED",
        subscriptionStatus: status,
      });
      return;
    }

    (req as any).subscription = status;
    next();
  } catch (err) {
    console.error("[SUBSCRIPTION] Error checking subscription:", err);
    res.status(500).json({ success: false, error: "Failed to verify subscription" });
  }
}
