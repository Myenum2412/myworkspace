import { Router, Response } from "express";
import mongoose from "mongoose";
import { Organization } from "../lib/db/models/Organization.js";
import { StorageQuota, getPlanLimits } from "../lib/db/models/StorageQuota.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { stripe, getPriceId } from "../config/stripe.js";
import { env } from "../config/env.js";

const router = Router();

async function resolveOrg(orgId: string) {
  const filter: Record<string, unknown>[] = [{ id: orgId }];
  if (mongoose.Types.ObjectId.isValid(orgId)) {
    filter.push({ _id: new mongoose.Types.ObjectId(orgId) });
  }
  return Organization.findOne({ $or: filter });
}

async function findOrgMembership(orgId: string, userId: string): Promise<Record<string, any> | null> {
  const { default: mongoose } = await import("mongoose");
  const { OrgMember } = await import("../lib/db/models/OrgMember.js");

  const filters: Record<string, any>[] = [{ orgId, userId }];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    filters.push({ orgId, userId: new mongoose.Types.ObjectId(userId) });
  }
  let membership = await OrgMember.findOne({ $or: filters }).lean();

  if (membership) return membership;

  // Fallback to NextAuth org_members collection — users created via frontend
  // sign-up have their membership in org_members, not in Mongoose's orgmembers.
  const db = mongoose.connection.db;
  if (db) {
    const nextAuthFilter: Record<string, unknown> = {
      orgId,
      userId: { $in: [userId] },
    };
    if (mongoose.Types.ObjectId.isValid(userId)) {
      (nextAuthFilter.userId as any[]).push(new mongoose.Types.ObjectId(userId));
    }
    const nextAuthMember = await db.collection("org_members").findOne(nextAuthFilter) as Record<string, unknown> | null;
    if (nextAuthMember) {
      membership = {
        orgId: nextAuthMember.orgId as string,
        userId: nextAuthMember.userId as string,
        role: nextAuthMember.role as string,
      } as any;
    }
  }

  return membership;
}

async function requireAdmin(req: AuthRequest, orgId: string) {
  const membership = await findOrgMembership(orgId, req.user!.userId);
  if (!membership || membership.role !== "admin") {
    throw new AppError(403, "Only organization admins can manage billing");
  }
}

function parseOrgId(id: unknown): string {
  if (!id || typeof id !== "string") throw new AppError(400, "orgId is required");
  return id;
}

// POST /api/billing/webhook — no auth, raw body for Stripe signature verification
router.post("/webhook", async (req: AuthRequest, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig) {
    res.status(400).json({ success: false, error: "Missing stripe-signature header" });
    return;
  }

  const rawBody = req.body as Buffer;
  if (!rawBody || !Buffer.isBuffer(rawBody)) {
    res.status(400).json({ success: false, error: "Webhook requires raw body" });
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error("[STRIPE WEBHOOK] Signature verification failed:", err.message);
    res.status(400).json({ success: false, error: `Webhook Error: ${err.message}` });
    return;
  }

  console.log(`[STRIPE WEBHOOK] Received event: ${event.type}`);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as any;
      const orgId = session.metadata?.orgId;
      const plan = session.metadata?.plan || "growth";
      if (orgId) {
        const org = await resolveOrg(orgId);
        if (org) {
          org.plan = plan;
          org.stripeCustomerId = session.customer as string;
          org.stripeSubscriptionId = session.subscription as string;
          org.subscriptionStatus = "active";
          const limits = getPlanLimits(plan);
          await StorageQuota.updateOne(
            { orgId },
            {
              $set: {
                maxStorageBytes: limits.maxStorageBytes,
                maxFileSizeBytes: limits.maxFileSizeBytes,
                userStorageLimitBytes: limits.userStorageLimitBytes,
              },
            },
            { upsert: true }
          );
          await org.save();
          console.log(`[STRIPE WEBHOOK] Org ${orgId} upgraded to ${plan}`);
        }
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as any;
      const subId = subscription.id;
      const org = await Organization.findOne({ stripeSubscriptionId: subId });
      if (org) {
        org.subscriptionStatus = subscription.status;
        org.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        if (subscription.trial_end) {
          org.trialEnd = new Date(subscription.trial_end * 1000);
        }
        const price = subscription.items?.data?.[0]?.price;
        if (price && price.metadata?.plan) {
          org.plan = price.metadata.plan;
        }
        await org.save();
        console.log(`[STRIPE WEBHOOK] Subscription ${subId} updated: ${subscription.status}`);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const deletedSub = event.data.object as any;
      const deletedOrg = await Organization.findOne({ stripeSubscriptionId: deletedSub.id });
      if (deletedOrg) {
        deletedOrg.plan = "free";
        deletedOrg.subscriptionStatus = "canceled";
        deletedOrg.stripeSubscriptionId = undefined;
        const limits = getPlanLimits("free");
        await StorageQuota.updateOne(
          { orgId: deletedOrg._id.toString() },
          {
            $set: {
              maxStorageBytes: limits.maxStorageBytes,
              maxFileSizeBytes: limits.maxFileSizeBytes,
              userStorageLimitBytes: limits.userStorageLimitBytes,
            },
          },
          { upsert: true }
        );
        await deletedOrg.save();
        console.log(`[STRIPE WEBHOOK] Org ${deletedOrg._id} downgraded to free`);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as any;
      console.log(`[STRIPE WEBHOOK] Invoice ${invoice.id} paid for customer ${invoice.customer}`);
      break;
    }

    case "invoice.payment_failed": {
      const failedInvoice = event.data.object as any;
      console.error(`[STRIPE WEBHOOK] Payment failed for invoice ${failedInvoice.id}, customer ${failedInvoice.customer}`);
      break;
    }
  }

  res.json({ success: true, received: true });
});

// All routes below require authentication
router.use(authenticate);

// POST /api/billing/create-checkout-session
router.post("/create-checkout-session", async (req: AuthRequest, res: Response) => {
  const { plan, orgId } = req.body as { plan?: string; orgId?: string };
  if (!plan || !["growth", "enterprise"].includes(plan)) {
    throw new AppError(400, "Valid plan (growth or enterprise) is required");
  }

  const targetOrgId = parseOrgId(orgId || req.user!.orgId);
  await requireAdmin(req, targetOrgId);

  const org = await resolveOrg(targetOrgId);
  if (!org) throw new AppError(404, "Organization not found");

  const priceId = getPriceId(plan);

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: req.user!.email,
      metadata: { orgId: targetOrgId },
    });
    customerId = customer.id;
    org.stripeCustomerId = customerId;
    await org.save();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${env.APP_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.APP_URL}/billing/plans`,
    metadata: { orgId: targetOrgId, plan },
    subscription_data: {
      metadata: { orgId: targetOrgId, plan },
    },
  });

  res.json({ success: true, data: { sessionId: session.id, url: session.url } });
});

// POST /api/billing/portal-session
router.post("/portal-session", async (req: AuthRequest, res: Response) => {
  const { orgId } = req.body as { orgId?: string };

  const targetOrgId = parseOrgId(orgId || req.user!.orgId);
  await requireAdmin(req, targetOrgId);

  const org = await resolveOrg(targetOrgId);
  if (!org) throw new AppError(404, "Organization not found");
  if (!org.stripeCustomerId) throw new AppError(400, "No Stripe customer found. Subscribe to a plan first.");

  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${env.APP_URL}/billing`,
  });

  res.json({ success: true, data: { url: session.url } });
});

// GET /api/billing/subscription
router.get("/subscription", async (req: AuthRequest, res: Response) => {
  const orgId = parseOrgId((req.query.orgId as string) || req.user!.orgId);

  const membership = await findOrgMembership(orgId, req.user!.userId);
  if (!membership) throw new AppError(403, "Not a member of this organization");

  const org = await resolveOrg(orgId);
  if (!org) throw new AppError(404, "Organization not found");

  let stripeSubscription: any = null;
  if (org.stripeSubscriptionId) {
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    } catch {
      // subscription may have been deleted in Stripe
    }
  }

  res.json({
    success: true,
    data: {
      plan: org.plan,
      stripeCustomerId: org.stripeCustomerId,
      stripeSubscriptionId: org.stripeSubscriptionId,
      subscriptionStatus: org.subscriptionStatus,
      currentPeriodEnd: org.currentPeriodEnd,
      trialEnd: org.trialEnd,
      stripeSubscription,
      hasPaymentMethod: org.stripeCustomerId ? true : false,
    },
  });
});

// GET /api/billing/invoices
router.get("/invoices", async (req: AuthRequest, res: Response) => {
  const orgId = parseOrgId((req.query.orgId as string) || req.user!.orgId);

  const membership = await findOrgMembership(orgId, req.user!.userId);
  if (!membership) throw new AppError(403, "Not a member of this organization");

  const org = await resolveOrg(orgId);
  if (!org) throw new AppError(404, "Organization not found");
  if (!org.stripeCustomerId) {
    res.json({ success: true, data: { invoices: [] } });
    return;
  }

  const stripeInvoices = await stripe.invoices.list({
    customer: org.stripeCustomerId,
    limit: 50,
  });

  const invoices = stripeInvoices.data.map((inv) => ({
    id: inv.id,
    number: inv.number,
    amountPaid: inv.amount_paid,
    currency: inv.currency,
    status: inv.status,
    pdfUrl: inv.invoice_pdf,
    hostedUrl: inv.hosted_invoice_url,
    createdAt: new Date(inv.created * 1000).toISOString(),
    periodStart: new Date(inv.period_start * 1000).toISOString(),
    periodEnd: new Date(inv.period_end * 1000).toISOString(),
  }));

  res.json({ success: true, data: { invoices } });
});

export default router;
