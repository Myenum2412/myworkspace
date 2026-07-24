"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/org/billing").then(r => r.json()).then(d => setInvoices(d.invoices || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
      <Card><CardHeader><CardTitle>Invoices</CardTitle></CardHeader><CardContent>
        {invoices.length === 0 ? <p className="text-sm text-muted-foreground">No invoices</p> : invoices.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between py-2 border-b last:border-0">
            <span>{inv.number} - {inv.customerName}</span>
            <Badge>{inv.status}</Badge>
          </div>
        ))}
      </CardContent></Card>
    </main>
  );
}
