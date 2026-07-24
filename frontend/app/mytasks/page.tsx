"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MyTasksInteractive from "./mytasks-interactive";
import { OverdueTasksCard, type OverdueTask } from "@/components/overdue-tasks-card";

export default function MyTasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ initialTasks: any[]; overdueTasks: OverdueTask[]; orgId: string; userId: string }>({ initialTasks: [], overdueTasks: [], orgId: "", userId: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/mytasks").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <OverdueTasksCard tasks={data.overdueTasks} />
      <MyTasksInteractive initialTasks={data.initialTasks} orgId={data.orgId} userId={data.userId} />
    </div>
  );
}
