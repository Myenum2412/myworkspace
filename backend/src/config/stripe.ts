import Stripe from "stripe";
import { env } from "./env.js";

export const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  growth: env.STRIPE_GROWTH_PRICE_ID,
  enterprise: env.STRIPE_ENTERPRISE_PRICE_ID,
};

function getStripe(): Stripe {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is required");
  return new Stripe(key, { apiVersion: "2025-03-31" as any, typescript: true });
}

export const stripe = getStripe();

export function getPriceId(plan: string): string {
  const id = STRIPE_PRICE_IDS[plan];
  if (!id) throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  return id;
}
