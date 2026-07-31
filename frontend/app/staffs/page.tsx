"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useIndustry } from "@/components/industry-provider";
import { Card } from "@/components/ui/card";
import Stats07 from "@/components/stats-07";
import { StaffRecentAllocatedTasks } from "./staff-recent-allocated-tasks";
import { apiFetch } from "@/lib/api";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

const COMPLETED_STATUSES = new Set(["completed", "done", "cancelled", "closed", "rejected"]);

export default function StaffsPage() {
  const { t } = useIndustry();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staffs")
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session?.user?.orgId) return;
    let cancelled = false;
    apiFetch(`/api/tasks?orgId=${session.user.orgId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled && d?.data) setTasks(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [session?.user?.orgId]);

  const taskStats = useMemo(() => {
    let total = 0, overdue = 0, dueToday = 0, dueWeek = 0;
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const weekEnd = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const t of tasks) {
      total++;
      if (t.dueDate && !COMPLETED_STATUSES.has(t.status)) {
        const due = new Date(t.dueDate);
        if (due < now) overdue++;
        else if (due <= todayEnd) dueToday++;
        else if (due <= weekEnd) dueWeek++;
      }
    }

    return { total, overdue, dueToday, dueWeek };
  }, [tasks]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <Card className="w-full px-6 py-5">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{greeting}</h2>
      </Card>

      <Stats07
        items={[
          { name: "Total Tasks", value: taskStats.total, subtitle: "All tasks" },
          { name: "Overdue", value: taskStats.overdue, subtitle: "Past due date" },
          { name: "Due Today", value: taskStats.dueToday, subtitle: "Due by today" },
          { name: "Due This Week", value: taskStats.dueWeek, subtitle: "Due within 7 days" },
        ]}
      />

      <div>
        <h2 className="text-lg font-semibold mb-3">Recently Allocated Tasks</h2>
        <StaffRecentAllocatedTasks tasks={tasks} />
      </div>

      <h1 className="text-2xl font-bold tracking-tight" data-tour-step-id="step-staffs">{t("page.staffs.title")}</h1>
    </main>
  );
}
