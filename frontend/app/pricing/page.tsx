import { Metadata } from "next";
import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import PricingBlock from "@/components/pricing-block";

export const metadata: Metadata = {
  title: "Pricing — MyWorkSpace Plans & Pricing",
  description: "Choose the right MyWorkSpace plan for your team. Compare Starter, Professional, and Enterprise plans with flexible pricing for project management, team collaboration, and business automation.",
  keywords: ["pricing", "plans", "subscription", "starter plan", "professional plan", "enterprise plan", "SaaS pricing", "workspace pricing"],
  openGraph: {
    title: "Pricing — MyWorkSpace Plans",
    description: "Compare MyWorkSpace plans. Find the right plan for your team.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pricing — MyWorkSpace Plans",
    description: "Compare MyWorkSpace plans for your team.",
  },
};

export default function PricingPage() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col">
        <PricingBlock />
      </main>
      <NewFooter />
    </>
  );
}
