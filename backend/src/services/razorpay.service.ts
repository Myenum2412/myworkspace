import Razorpay from "razorpay";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import { logger } from "../lib/logger/index.js";

// ── Razorpay Client ──

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new AppError(500, "Razorpay credentials not configured");
    }
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
}

// ── Types ──

export interface CreateOrderInput {
  amount: number; // in INR (smallest unit: paise)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface VerifyPaymentInput {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// ── Order Management ──

export async function createOrder(input: CreateOrderInput) {
  const rp = getRazorpay();

  const order = await rp.orders.create({
    amount: input.amount, // amount in paise
    currency: input.currency || "INR",
    receipt: input.receipt || `rcpt_${uuid().slice(0, 8)}`,
    notes: input.notes || {},
  });

  logger.info({ orderId: order.id, amount: input.amount }, "Razorpay order created");

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    receipt: order.receipt,
  };
}

export async function verifyPayment(input: VerifyPaymentInput) {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new AppError(500, "Razorpay credentials not configured");
  }

  // Verify signature
  const body = input.razorpay_order_id + "|" + input.razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== input.razorpay_signature) {
    logger.warn({ orderId: input.razorpay_order_id }, "Payment signature mismatch");
    throw new AppError(400, "Payment verification failed: invalid signature");
  }

  // Fetch payment details
  const rp = getRazorpay();
  const payment = await rp.payments.fetch(input.razorpay_payment_id);

  logger.info({
    paymentId: input.razorpay_payment_id,
    orderId: input.razorpay_order_id,
    status: payment.status,
    amount: payment.amount,
  }, "Payment verified successfully");

  return {
    verified: true,
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    method: payment.method,
    captured: payment.captured,
  };
}

export async function fetchPayment(paymentId: string) {
  const rp = getRazorpay();
  const payment = await rp.payments.fetch(paymentId);
  return payment;
}

export async function fetchOrder(orderId: string) {
  const rp = getRazorpay();
  const order = await rp.orders.fetch(orderId);
  return order;
}

export async function refundPayment(paymentId: string, amount?: number) {
  const rp = getRazorpay();
  const refund = await rp.payments.refund(paymentId, {
    amount, // optional, full refund if not provided
  });
  return refund;
}

// ── Webhook Verification ──

export function verifyWebhookSignature(
  body: string,
  signature: string,
): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

// ── Helpers ──

export function getPublicKey(): string {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) throw new AppError(500, "Razorpay key not configured");
  return keyId;
}

export function convertToPaise(amountInRupees: number): number {
  return Math.round(amountInRupees * 100);
}

export function convertToRupees(amountInPaise: number): number {
  return amountInPaise / 100;
}
