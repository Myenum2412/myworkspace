import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { platformAdminOnly } from "../middleware/authorize.js";
import { requireString, optionalString } from "../lib/validate.js";
import * as razorpayService from "../services/razorpay.service.js";
import * as planService from "../services/plan.service.js";
import { processEvent } from "../services/notification-engine.service.js";

const router = Router();
router.use(authenticate);

// ── Get Razorpay Public Key ──

router.get("/key", async (_req: AuthRequest, res: Response) => {
  const keyId = razorpayService.getPublicKey();
  res.json({ success: true, keyId });
});

// ── Create Order ──

router.post("/create-order", platformAdminOnly(), async (req: AuthRequest, res: Response) => {
  const { planId, orgId, billingCycle } = req.body;

  if (!planId) throw new AppError(400, "planId is required");
  if (!orgId) throw new AppError(400, "orgId is required");

  // Get the plan to determine amount
  const plan = await planService.getPlan(planId);
  if (!plan) throw new AppError(404, "Plan not found");

  const amount = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  if (amount <= 0) {
    throw new AppError(400, "This plan has no price configured. Contact support.");
  }

  const order = await razorpayService.createOrder({
    amount: razorpayService.convertToPaise(amount),
    currency: plan.currency || "INR",
    receipt: `plan_${planId}_${orgId}_${Date.now()}`,
    notes: {
      planId,
      orgId,
      billingCycle: billingCycle || "monthly",
      planName: plan.name,
    },
  });

  processEvent({
    userId: req.user!.userId,
    orgId,
    createdBy: req.user!.userId,
    type: "payment_initiated",
    category: "billing",
    title: `Payment order created for plan "${plan.name}"`,
    metadata: { planId, orgId, orderId: order.orderId, amount },
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: razorpayService.getPublicKey(),
      planName: plan.name,
      planId: plan.id,
      orgId,
      billingCycle: billingCycle || "monthly",
    },
  });
});

// ── Verify Payment & Assign Plan ──

router.post("/verify", platformAdminOnly(), async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, orgId, billingCycle } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new AppError(400, "Payment verification data is required");
  }
  if (!planId || !orgId) {
    throw new AppError(400, "planId and orgId are required");
  }

  // Verify the payment signature
  const verified = await razorpayService.verifyPayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!verified.verified) {
    throw new AppError(400, "Payment verification failed");
  }

  // Check payment status
  if (verified.status !== "captured" && verified.status !== "authorized") {
    throw new AppError(400, `Payment not completed. Status: ${verified.status}`);
  }

  // Assign the plan to the organization
  const subscription = await planService.assignPlanToOrg(
    orgId,
    planId,
    billingCycle || "monthly",
    req.user!.userId,
    `Paid via Razorpay (Payment ID: ${razorpay_payment_id})`,
  );

  processEvent({
    userId: req.user!.userId,
    orgId,
    createdBy: req.user!.userId,
    type: "subscription_activated",
    category: "billing",
    title: "Payment verified and plan activated",
    metadata: {
      planId,
      orgId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: verified.amount,
      subscriptionId: subscription.id,
    },
  }).catch(() => {});

  res.json({
    success: true,
    data: {
      subscriptionId: subscription.id,
      planId,
      orgId,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amount: razorpayService.convertToRupees(Number(verified.amount)),
      status: "active",
    },
  });
});

// ── Razorpay Webhook ──

router.post("/webhook", async (req: AuthRequest, res: Response) => {
  const signature = req.headers["x-razorpay-signature"] as string;
  const body = JSON.stringify(req.body);

  // Verify webhook signature
  if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    const isValid = razorpayService.verifyWebhookSignature(body, signature);
    if (!isValid) {
      logger.warn("Invalid Razorpay webhook signature");
      throw new AppError(400, "Invalid webhook signature");
    }
  }

  const event = req.body;
  const eventType = event.event;

  logger.info({ eventType, payload: event.payload?.payment?.entity?.id }, "Razorpay webhook received");

  // Handle different event types
  switch (eventType) {
    case "payment.captured":
      // Payment captured successfully - could trigger additional logic
      break;
    case "payment.failed":
      // Payment failed - could notify admin
      break;
    case "subscription.activated":
      // Subscription activated
      break;
    case "subscription.charged":
      // Recurring payment charged
      break;
    case "subscription.cancelled":
      // Subscription cancelled
      break;
    default:
      logger.info({ eventType }, "Unhandled Razorpay webhook event");
  }

  res.json({ status: "ok" });
});

// ── Get Payment Details ──

router.get("/payment/:paymentId", platformAdminOnly(), async (req: AuthRequest, res: Response) => {
  const payment = await razorpayService.fetchPayment(req.params.paymentId);
  res.json({ success: true, data: payment });
});

// ── Refund Payment ──

router.post("/refund", platformAdminOnly(), async (req: AuthRequest, res: Response) => {
  const { paymentId, amount } = req.body;
  if (!paymentId) throw new AppError(400, "paymentId is required");

  const refund = await razorpayService.refundPayment(paymentId, amount);

  processEvent({
    userId: req.user!.userId,
    orgId: req.user!.orgId || "system",
    createdBy: req.user!.userId,
    type: "payment_refunded",
    category: "billing",
    title: `Payment refunded: ${paymentId}`,
    metadata: { paymentId, refundId: refund.id, amount },
  }).catch(() => {});

  res.json({ success: true, data: refund });
});

// Need to import logger for webhook route
import { logger } from "../lib/logger/index.js";

export default router;
