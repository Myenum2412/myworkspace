"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function AuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/audit").then(r => r.json()).then(d => setLogs(d.logs || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
      <div className="space-y-2">
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">No audit logs</p> : logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="font-medium">{log.action}</p><p className="text-sm text-muted-foreground">{log.details}</p></div>
            <Badge variant="outline">{log.createdAt}</Badge>
          </div>
        ))}
      </div>
    </main>
  );
}
