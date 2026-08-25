export interface PriceTier {
  id: string;
  name: string;
  inr: string;
  usd: string;
  period: string;
  description: string;
  bestFor: string;
  features: string[];
  limits: string[];
  popular: boolean;
  highlighted: boolean;
  storageGB: number;
  cta: string;
}

export const priceTiers: PriceTier[] = [
  {
    id: "starter",
    name: "Starter",
    inr: "₹999",
    usd: "$12",
    period: "/month",
    description: "Best For",
    bestFor: "Freelancers, Startups, Small Teams (Up to 10 Users)",
    features: [
      "Employee Management",
      "Project Management",
      "Task Management",
      "Time Tracking",
      "Attendance",
      "Basic File Management (100 GB)",
      "Team Collaboration",
      "Client Portal",
      "Email Notifications",
      "Mobile Responsive",
      "Basic Reports",
    ],
    limits: ["10 Users", "10 GB Max File Upload", "Email Support"],
    popular: false,
    highlighted: false,
    storageGB: 100,
    cta: "Get Started",
  },
  {
    id: "professional",
    name: "Professional",
    inr: "₹3,999",
    usd: "$49",
    period: "/month",
    description: "Most Popular",
    bestFor: "Growing Companies, Digital Agencies, IT Companies, Engineering Firms",
    features: [
      "Everything in Starter +",
      "Unlimited Projects",
      "Up to 50 Users",
      "1 TB Secure Storage",
      "Advanced File Version Control",
      "File Approval Workflow",
      "External Secure File Sharing",
      "Client Workspace",
      "Organization Dashboard",
      "Team Analytics",
      "Performance Reports",
      "Billing & Invoice Module",
      "Workflow Automation",
      "Role Based Permissions (RBAC)",
      "Google Login",
      "GitHub Login",
      "Real-Time Notifications",
      "Offline Mode",
      "API Access",
      "Priority Email Support",
    ],
    limits: ["50 Users", "1 TB Storage"],
    popular: true,
    highlighted: true,
    storageGB: 1024,
    cta: "Get Started",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    inr: "Custom",
    usd: "Custom",
    period: "",
    description: "Best For",
    bestFor: "Large Enterprises, Multi-Branch Companies, Government, Healthcare",
    features: [
      "Everything in Professional +",
      "Unlimited Users",
      "Unlimited Storage",
      "Multi Organization",
      "Multi Tenant",
      "Single Sign-On (SSO)",
      "Advanced Security",
      "2FA Authentication",
      "Audit Logs",
      "Advanced Analytics",
      "Custom Roles & Permissions",
      "White Label Branding",
      "Dedicated Client Portal",
      "API Integrations",
      "Custom Development",
      "On-Premise Deployment",
      "Dedicated Account Manager",
      "24×7 Priority Support",
      "SLA Guarantee",
      "Training & Onboarding",
      "Dedicated Server Deployment",
    ],
    limits: [],
    popular: false,
    highlighted: false,
    storageGB: 9999,
    cta: "Contact Sales",
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
