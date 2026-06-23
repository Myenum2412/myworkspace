import type { Metadata } from "next";
import { Pricing } from "@/components/pricing";
import { Nav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the right plan for your team.",
};

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 pt-16">
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
