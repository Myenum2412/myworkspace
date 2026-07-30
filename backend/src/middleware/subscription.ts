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
  return {
    hasAccess: true,
    plan: "enterprise",
    subscriptionStatus: "active",
    trialEnd: null,
    currentPeriodEnd: null,
    daysRemaining: 999999,
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
