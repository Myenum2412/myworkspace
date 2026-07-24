"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function StaffListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/staffs/list").then(r => r.json()).then(d => setEmployees(d.employees || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Staff List</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {employees.map((e) => (
          <Card key={e.id}><CardContent className="p-4 flex items-center gap-4">
            <Avatar><AvatarImage src={e.avatar} /><AvatarFallback>{e.name?.[0] || "U"}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{e.name}</p><p className="text-sm text-muted-foreground truncate">{e.email}</p></div>
            <Badge variant="outline">{e.role}</Badge>
          </CardContent></Card>
        ))}
      </div>
    </main>
  );
}
