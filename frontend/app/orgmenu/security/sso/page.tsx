"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SSOPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sso, setSso] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/security/sso").then(r => r.json()).then(d => setSso(d.sso)).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">SSO</h1>
      <Card><CardHeader><CardTitle>Single Sign-On</CardTitle></CardHeader><CardContent>
        <div className="flex items-center gap-2">
          <span>Status:</span>
          <Badge variant={sso?.enabled ? "default" : "secondary"}>{sso?.enabled ? "Enabled" : "Disabled"}</Badge>
        </div>
        {sso?.provider && <p className="text-sm mt-2">Provider: {sso.provider}</p>}
      </CardContent></Card>
    </main>
  );
}
