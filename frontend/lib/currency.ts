export interface PriceTier {
  id: string;
  name: string;
  inr: string;
  usd: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
  storageGB: number;
}

export const priceTiers: PriceTier[] = [
  {
    id: "starter",
    name: "Free",
    inr: "₹0",
    usd: "$0",
    period: "/month",
    description: "Get started with essential features for small teams.",
    features: [
      "Up to 5 team members",
      "3 projects",
      "Basic task management",
      "10 GB storage",
      "Email support",
    ],
    popular: false,
    storageGB: 10,
  },
  {
    id: "growth",
    name: "Growth",
    inr: "₹6,000",
    usd: "$79",
    period: "/month",
    description: "For growing teams that need advanced collaboration tools.",
    features: [
      "Up to 50 team members",
      "Unlimited projects",
      "Advanced time tracking",
      "200 GB storage",
      "Custom workflows",
      "Analytics & reports",
      "Priority support",
      "Integrations",
    ],
    popular: true,
    storageGB: 200,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    inr: "Custom",
    usd: "Custom",
    period: "",
    description: "For organizations requiring enterprise-grade security and control.",
    features: [
      "Unlimited team members",
      "Unlimited projects",
      "Unlimited storage",
      "Dedicated account manager",
      "SSO & SAML",
      "Audit logs",
      "Custom integrations",
      "SLA guarantee",
    ],
    popular: false,
    storageGB: 9999,
  },
];

export type Currency = "USD" | "INR";

export function getPrice(tier: PriceTier, currency: Currency): string {
  return currency === "INR" ? tier.inr : tier.usd;
}

export function getCurrencySymbol(currency: Currency): string {
  return currency === "INR" ? "₹" : "$";
}

export function getCountryCurrency(country: string | null): Currency {
  if (!country) return "USD";
  const upper = country.toUpperCase();
  if (upper === "IN" || upper === "INDIA") return "INR";
  return "USD";
}

export const INR_COUNTRIES = ["IN", "INDIA"];
