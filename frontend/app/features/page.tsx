"use client";

import { useMemo, useState } from "react";
import { Integrations } from "@/components/integrations";
import { MorphingTabs, type MorphingTabsItem } from "@/components/motion/morphing-tabs";

const FEATURE_CONTENT: Record<
  string,
  { eyebrow: string; title: string; detail: string; accent: string; bullets: string[] }
> = {
  projects: {
    eyebrow: "get organized",
    title: "Projects",
    detail:
      "Organize work from kickoff to delivery. Define timelines, track budgets, and keep every stakeholder aligned in one place.",
    accent: "#db5b2f",
    bullets: [
      "Gantt-style timelines and milestones",
      "Budget tracking and spend visibility",
      "Role-scoped access for every member",
    ],
  },
  tasks: {
    eyebrow: "stay in flow",
    title: "Tasks",
    detail:
      "Smart boards, kanban views, and dependency tracking turn scattered to-dos into a plan the whole team can execute.",
    accent: "#1bb273",
    bullets: [
      "Drag-and-drop kanban boards",
      "Assignees, priorities, and due dates",
      "Sprint planning kick-offs",
    ],
  },
  chat: {
    eyebrow: "work together",
    title: "Chat & Calls",
    detail:
      "Real-time messaging, HD video calls, and screen sharing keep decisions fast and conversations in context.",
    accent: "#0358f7",
    bullets: [
      "Instant group and 1:1 messaging",
      "HD audio, video, and screen share",
      "Encrypted WebSocket + DTLS-SRTP",
    ],
  },
  billing: {
    eyebrow: "get paid",
    title: "Invoices & Billing",
    detail:
      "Generate professional invoices, automate reminders, and track unpaid balances without leaving your workspace.",
    accent: "#c679c4",
    bullets: [
      "Custom templates and branding",
      "Automated payment reminders",
      "Receipts and payment history",
    ],
  },
  files: {
    eyebrow: "find anything",
    title: "Files & Storage",
    detail:
      "Upload, preview, and organize every asset in secure folders with granular access control and full search.",
    accent: "#ffb005",
    bullets: [
      "Secure cloud storage",
      "Inline previews for 30+ formats",
      "Team folders with access control",
    ],
  },
};

function FeaturePanel({ id }: { id: string }) {
  const feature = FEATURE_CONTENT[id];

  return (
    <div className="relative min-h-64 overflow-hidden bg-[radial-gradient(circle_at_1px_1px,#dfe2e3_1px,transparent_1.5px)] bg-[size:4.8rem_4.8rem] px-7 py-8 md:px-12 md:py-10">
      <div className="relative max-w-xl">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-black/40">
          {feature.eyebrow}
        </p>
        <h3 className="mt-3 text-3xl font-light tracking-[-0.055em] text-[#151515] md:text-5xl">
          {feature.title}
        </h3>
        <p className="mt-4 max-w-md text-sm leading-6 text-black/55 md:text-base">
          {feature.detail}
        </p>
        <ul className="mt-6 space-y-2">
          {feature.bullets.map((bullet) => (
            <li key={bullet} className="flex items-center gap-2 text-xs font-medium text-black/50">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: feature.accent }}
              />
              {bullet}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex items-center gap-3 text-xs font-medium text-black/50">
          <span className="size-2 rounded-full" style={{ backgroundColor: feature.accent }} />
          drag to reorder
        </div>
      </div>
    </div>
  );
}

export default function FeaturesPage() {
  const initialItems = useMemo<MorphingTabsItem[]>(
    () =>
      Object.keys(FEATURE_CONTENT).map((id) => ({
        id,
        label: FEATURE_CONTENT[id].title,
        content: <FeaturePanel id={id} />,
      })),
    [],
  );
  const [items, setItems] = useState(initialItems);
  const [value, setValue] = useState<string | null>(initialItems[0]?.id ?? null);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-foreground px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-background">Features</h1>
        <p className="mt-2 text-muted-foreground">
          Everything your team ships with — in one workspace.
        </p>
      </div>
      <MorphingTabs
        items={items}
        value={value}
        onValueChange={setValue}
        onOrderChange={(ids) => {
          setItems((current) => {
            const byId = new Map(current.map((item) => [item.id, item]));
            return ids.flatMap((id) => {
              const item = byId.get(id);
              return item ? [item] : [];
            });
          });
        }}
        ariaLabel="MyWorkSpace features"
        className="w-full max-w-5xl"
      />
      <section className="mt-16 w-full rounded-[2rem] bg-background text-foreground">
        <Integrations />
      </section>
    </main>
  );
}
