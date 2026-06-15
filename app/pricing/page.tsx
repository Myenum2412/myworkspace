import type { Metadata } from "next";
import { Pricing } from "@/components/pricing";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose the right plan for your team.",
};

export default function PricingPage() {
  return (
    <SidebarProvider>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4" />
        </header>
        <main className="flex flex-1 flex-col items-center p-4">
          <Pricing />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
