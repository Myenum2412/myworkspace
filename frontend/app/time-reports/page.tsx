"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TimeReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/time-reports").then(r => r.json()).then(d => setEntries(d.entries || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Time Reports</h1>
      <Card><CardHeader><CardTitle>Entries</CardTitle></CardHeader><CardContent>
        {entries.length === 0 ? <p className="text-sm text-muted-foreground">No entries</p> : entries.slice(0, 20).map((e) => (
          <div key={e._id} className="flex items-center justify-between py-2 border-b last:border-0">
            <span>{e.projectName} - {e.task}</span>
            <span className="text-sm text-muted-foreground">{e.duration}min - {e.date}</span>
          </div>
        ))}
      </CardContent></Card>
    </main>
  );
}
