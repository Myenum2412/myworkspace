"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileTextIcon } from "lucide-react";

export default function AuditExportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exports, setExports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/audit/exports").then(r => r.json()).then(d => setExports(d.exports || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Audit Exports</h1>
      <Card><CardHeader><CardTitle>Exports</CardTitle></CardHeader><CardContent>
        {exports.length === 0 ? <p className="text-sm text-muted-foreground">No exports</p> : exports.map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <div className="flex items-center gap-2"><FileTextIcon className="size-4" /><span>{e.format.toUpperCase()}</span></div>
            <Button variant="outline" size="sm"><DownloadIcon className="size-4 mr-1" />Download</Button>
          </div>
        ))}
      </CardContent></Card>
    </main>
  );
}
