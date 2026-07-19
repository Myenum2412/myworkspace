"use client";

import { RiPuzzle2Line } from "@remixicon/react";
import IntegrationsBlock from "@/components/integrations-block";

export default function AddonsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-3">
        <RiPuzzle2Line className="size-7 shrink-0" />
        <h1 className="text-xl sm:text-2xl font-bold">Addons</h1>
      </div>

      <IntegrationsBlock />
    </main>
  );
}
