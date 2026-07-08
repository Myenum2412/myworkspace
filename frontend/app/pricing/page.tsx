import type { Metadata } from "next";
import { Pricing } from "@/components/pricing";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { PricingExpiredBanner } from "@/components/pricing-expired-banner";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the right plan for your team.",
};

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <PricingExpiredBanner />
        </div>
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
