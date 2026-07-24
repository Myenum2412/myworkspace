"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrgMenuPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Organization Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Members</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{data?.stats?.totalMembers || 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Active Projects</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{data?.stats?.activeProjects || 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Pending Tasks</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{data?.stats?.pendingTasks || 0}</p></CardContent></Card>
      </div>
    </main>
  );
}
