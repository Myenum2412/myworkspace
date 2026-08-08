"use client";

import { DiaTextReveal } from "@/components/ui/dia-text-reveal";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-3xl font-semibold tracking-tight md:text-4xl">
        <DiaTextReveal text="My WorkSpace" repeat repeatDelay={1.2} duration={1.5} />
      </div>
    </div>
  );
}
