"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TASK_TABS = [
  { value: "overview", label: "Overview", href: "/overview" },
  { value: "team_tasks", label: "Team Tasks", href: "/teamtasks" },
  { value: "all_tasks", label: "All Tasks", href: "/alltasks" },
  { value: "my_tasks", label: "My Tasks", href: "/mytasks" },
  { value: "saved_tasks", label: "Saved Tasks", href: "/savedtasks" },
  { value: "upcoming_tasks", label: "Upcoming Tasks", href: "/upcomingtasks" },
];

export function TaskTabs() {
  const pathname = usePathname();
  const router = useRouter();

  const activeValue = TASK_TABS.find((tab) => tab.href === pathname)?.value ?? "overview";

  return (
    <Tabs
      value={activeValue}
      onValueChange={(value) => {
        const tab = TASK_TABS.find((t) => t.value === value);
        if (tab && tab.href !== pathname) router.push(tab.href);
      }}
      className="w-full"
    >
      <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
        {TASK_TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
