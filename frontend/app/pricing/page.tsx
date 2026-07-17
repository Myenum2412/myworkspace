import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import PricingBlock from "@/components/pricing-block";

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
