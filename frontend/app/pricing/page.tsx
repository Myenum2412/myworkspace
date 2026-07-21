import { Metadata } from "next";
import PricingBlock from "@/components/pricing-block";

export const metadata: Metadata = {
  title: "Pricing — India Plans & Pricing",
  description: "Choose the right pricing plan for your business in India. Compare Starter (₹5,000), Growth (₹15,000), and Enterprise (₹35,000+) plans designed for startups, growing businesses, and enterprises.",
  keywords: ["pricing", "plans", "India pricing", "starter plan", "growth plan", "enterprise plan", "₹5,000", "₹15,000", "₹35,000", "Indian market pricing"],
  openGraph: {
    title: "Pricing — India Plans",
    description: "Choose from Starter (₹5,000), Growth (₹15,000), or Enterprise (₹35,000+) plans. Tailored for the Indian market.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pricing — India Plans",
    description: "Choose from Starter (₹5,000), Growth (₹15,000), or Enterprise (₹35,000+) plans.",
  },
};

export default function PricingPage() {
  return <PricingBlock />;
}
