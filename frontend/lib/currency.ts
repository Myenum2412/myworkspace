export interface PriceTier {
  id: string;
  name: string;
  inr: string;
  usd: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
}

export const priceTiers: PriceTier[] = [
  {
    id: "starter",
    name: "Starter",
    inr: "₹3,000",
    usd: "$29",
    period: "/month",
    description: "Perfect for small teams getting started with project management.",
    features: [
      "Up to 10 team members",
      "5 projects",
      "Basic time tracking",
      "Task management",
      "Email notifications",
      "7-day history",
    ],
    popular: false,
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
      "Custom workflows",
      "Analytics & reports",
      "Priority support",
      "Integrations",
      "90-day history",
    ],
    popular: true,
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
      "Dedicated account manager",
      "SSO & SAML",
      "Audit logs",
      "Custom integrations",
      "SLA guarantee",
      "Unlimited history",
    ],
    popular: false,
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
