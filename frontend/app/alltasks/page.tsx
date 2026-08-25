"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { TaskTabs } from "@/components/task-tabs";
import AllTasksInteractive from "./alltasks-interactive";

export default function AllTasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ initialTasks: any[]; orgId: string; sessionUserId: string }>({
    initialTasks: [],
    orgId: "",
    sessionUserId: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/alltasks")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || loading)
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  if (!session?.user) return null;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <TaskTabs />
      <AllTasksInteractive
        initialTasks={data.initialTasks}
        orgId={data.orgId}
        sessionUserId={data.sessionUserId}
      />
    </div>
  );
}
