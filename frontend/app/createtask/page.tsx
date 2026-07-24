"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateTaskPageInteractive } from "./page-interactive";
import { OverdueTasksCard, type OverdueTask } from "@/components/overdue-tasks-card";

export default function CreateTaskPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/createtask").then(r => r.json()).then(d => setOverdueTasks(d.overdueTasks || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      <div className="p-4"><OverdueTasksCard tasks={overdueTasks} /></div>
      <CreateTaskPageInteractive />
    </main>
  );
}
