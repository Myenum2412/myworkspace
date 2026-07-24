"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function RolesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<{ roles: any[]; members: any[] }>({ roles: [], members: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/members/roles").then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Roles</CardTitle></CardHeader><CardContent>
          {data.roles.length === 0 ? <p className="text-sm text-muted-foreground">No custom roles</p> : data.roles.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2"><span>{r.name}</span><Badge>{r.permissions?.length || 0} permissions</Badge></div>
          ))}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Members by Role</CardTitle></CardHeader><CardContent>
          {data.members.map((m) => (
            <div key={m.userId} className="flex items-center justify-between py-2"><span>{m.name}</span><Badge variant="outline">{m.role}</Badge></div>
          ))}
        </CardContent></Card>
      </div>
    </main>
  );
}
