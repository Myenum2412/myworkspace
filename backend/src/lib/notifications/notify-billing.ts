import { createNotification } from "../../services/notification.service.js";

export const notifyBilling = {
  async invoiceGenerated(userId: string, orgId: string, invoiceNumber: string, amount: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "invoice_generated", category: "billing",
      title: "Invoice Generated",
      message: `Invoice #${invoiceNumber} for ${amount} has been generated`,
      link: link || "/billing",
      actions: [{ label: "View Invoice", action: "view", url: link || "/billing", primary: true }],
      metadata: { invoiceNumber, amount },
    });
  },

  async invoicePaid(userId: string, orgId: string, invoiceNumber: string, amount: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "invoice_paid", category: "billing",
      title: "Invoice Paid",
      message: `Invoice #${invoiceNumber} for ${amount} has been paid successfully`,
      link: link || "/billing",
      metadata: { invoiceNumber, amount },
    });
  },

  async paymentFailed(userId: string, orgId: string, invoiceNumber: string, amount: string, reason: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "payment_failed", category: "billing", priority: "high",
      title: "Payment Failed",
      message: `Payment for invoice #${invoiceNumber} (${amount}) failed: ${reason}`,
      link: link || "/billing",
      actions: [
        { label: "Update Payment Method", action: "view", url: link || "/billing", primary: true },
      ],
      metadata: { invoiceNumber, amount, reason },
    });
  },

  async refundProcessed(userId: string, orgId: string, amount: string, reason: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "refund_processed", category: "billing",
      title: "Refund Processed",
      message: `Refund of ${amount} has been processed${reason ? `: ${reason}` : ""}`,
      link: link || "/billing",
      metadata: { amount, reason },
    });
  },

  async renewalReminder(userId: string, orgId: string, planName: string, daysRemaining: number, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "subscription_renewal_reminder", category: "billing", priority: "high",
      title: "Renewal Reminder",
      message: `Your ${planName} plan will renew in ${daysRemaining} days`,
      link: link || "/billing",
      actions: [{ label: "Manage Subscription", action: "view", url: link || "/billing", primary: true }],
      metadata: { planName, daysRemaining },
    });
  },

  async trialEnding(userId: string, orgId: string, daysRemaining: number, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "trial_ending", category: "billing", priority: "high",
      title: "Trial Ending Soon",
      message: `Your free trial ends in ${daysRemaining} days. Upgrade to keep access to all features.`,
      link: link || "/billing",
      actions: [{ label: "Upgrade Now", action: "view", url: link || "/billing", primary: true }],
      metadata: { daysRemaining },
    });
  },

  async storageUpgradeAvailable(userId: string, orgId: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "storage_upgrade_available", category: "billing",
      title: "Storage Upgrade Available",
      message: "Additional storage is available. Upgrade your plan for more space.",
      link: link || "/settings/billing",
      actions: [{ label: "View Plans", action: "view", url: link || "/settings/billing", primary: true }],
    });
  },

  async planLimitReached(userId: string, orgId: string, limitType: string, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "plan_limit_reached", category: "billing", priority: "high",
      title: "Plan Limit Reached",
      message: `You've reached your ${limitType} limit. Upgrade to continue.`,
      link: link || "/settings/billing",
      actions: [{ label: "Upgrade Plan", action: "view", url: link || "/settings/billing", primary: true }],
      metadata: { limitType },
    });
  },

  async additionalUsersPurchased(userId: string, orgId: string, count: number, link?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "additional_users_purchased", category: "billing",
      title: "Additional Users Added",
      message: `${count} additional user seat(s) have been added to your plan`,
      link: link || "/settings/billing",
      metadata: { count },
    });
  },
};
