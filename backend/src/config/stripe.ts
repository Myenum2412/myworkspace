import Stripe from "stripe";
import { env } from "./env.js";

export const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  starter: env.STRIPE_STARTER_PRICE_ID,
  professional: env.STRIPE_PROFESSIONAL_PRICE_ID,
  enterprise: env.STRIPE_ENTERPRISE_PRICE_ID,
};

function getStripe(): Stripe {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY environment variable is required");
  return new Stripe(key, { 
    typescript: true,
    apiVersion: '2026-06-24.dahlia' as any
  });
}

export let stripe: Stripe;

try {
  stripe = getStripe();
} catch {
  // Stripe not configured — will be set up lazily if needed
  stripe = undefined as unknown as Stripe;
}

export function getPriceId(plan: string): string {
  const id = STRIPE_PRICE_IDS[plan];
  if (!id) throw new Error(`No Stripe price ID configured for plan: ${plan}`);
  return id;
}
