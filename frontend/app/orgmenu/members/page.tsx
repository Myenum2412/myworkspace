"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/members").then(r => r.json()).then(d => setMembers(d.members || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Members</h1><p className="text-sm text-muted-foreground">{members.length} team members</p></div>
        <Button asChild><Link href="/orgmenu/members/invite">Invite Member</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card key={m.userId}><CardContent className="p-4 flex items-center gap-4">
            <Avatar><AvatarImage src={m.avatar} /><AvatarFallback>{m.name?.[0] || "U"}</AvatarFallback></Avatar>
            <div className="flex-1 min-w-0"><p className="font-medium truncate">{m.name}</p><p className="text-sm text-muted-foreground truncate">{m.email}</p></div>
            <Badge variant={m.status === "online" ? "default" : "secondary"}>{m.role}</Badge>
          </CardContent></Card>
        ))}
      </div>
    </main>
  );
}
