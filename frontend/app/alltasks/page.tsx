"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AllTasksInteractive from "./alltasks-interactive";

export default function AllTasksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ initialTasks: any[]; orgId: string; sessionUserId: string }>({ initialTasks: [], orgId: "", sessionUserId: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/alltasks").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return <AllTasksInteractive initialTasks={data.initialTasks} orgId={data.orgId} sessionUserId={data.sessionUserId} />;
}
