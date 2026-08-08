"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import Stats07 from "@/components/stats-07";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { StaffRecentAllocatedTasks } from "./staff-recent-allocated-tasks";
import { StaffRecentRevisions } from "./staff-recent-revisions";
import { StaffRecentSubmissions } from "./staff-recent-submissions";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}

const COMPLETED_STATUSES = new Set(["completed", "done", "cancelled", "closed", "rejected"]);

export default function StaffsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    setGreeting(getGreeting());
    const interval = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    setLoading(true);
    apiFetch("/api/staffs/tasks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const initialTasks = Array.isArray(d?.initialTasks) ? d.initialTasks : [];
        const dataTasks = Array.isArray(d?.data) ? d.data : [];
        setTasks(initialTasks.length > 0 ? initialTasks : dataTasks);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const taskStats = useMemo(() => {
    let total = 0,
      overdue = 0,
      dueToday = 0,
      dueWeek = 0;
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

  if (status === "loading" || loading)
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recently Allocated Tasks</h2>
          <StaffRecentAllocatedTasks tasks={tasks} />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Recently Submissions</h2>
          <StaffRecentSubmissions tasks={tasks} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Revision</h2>
          <StaffRecentRevisions />
        </div>
      </div>
    </main>
  );
}
