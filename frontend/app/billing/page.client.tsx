"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ExternalLinkIcon, ClockIcon, CheckCircleIcon, IndianRupee, ReceiptIcon, TrendingUpIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useBootstrapStore } from "@/stores/bootstrap-store";

const BillingCharts = dynamic(() => import("./billing-charts"), {
  ssr: false,
  loading: () => null,
});

interface Invoice {
  id: string;
  number: string;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string;
  hostedUrl: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
}

const COLORS = {
  paid: "#22c55e",
  open: "#3b82f6",
  void: "#6b7280",
  uncollectible: "#f59e0b",
};

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const orgId = useBootstrapStore((s) => s.data?.orgId);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const controller = new AbortController();

    (async () => {
      try {
        const invRes = await fetch(`/api/billing/invoices?orgId=${orgId}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoices(invData.data?.invoices || []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error loading billing data");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [orgId]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-4" />;
  }

  const totalAmountPaid = invoices.reduce((acc, inv) => acc + (inv.amountPaid || 0), 0);
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const openInvoices = invoices.filter((inv) => inv.status === "open");
  const paymentRate = invoices.length > 0 ? Math.round((paidInvoices.length / invoices.length) * 100) : 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="size-6" />
          <h1 className="text-xl sm:text-2xl font-bold">Billing</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm"><Link href="/billing/receipts"><ReceiptIcon className="size-4 mr-1" />My Receipts</Link></Button>
          <Button asChild size="sm"><Link href="/billing/invoices"><FileTextIcon className="size-4 mr-1" />Invoices</Link></Button>
        </div>
      </div>

      {error && <div className="rounded-sm bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Paid</CardTitle></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">₹{(totalAmountPaid / 100).toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Invoices</CardTitle></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">{invoices.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold text-green-600">{paidInvoices.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Payment Rate</CardTitle></CardHeader><CardContent><div className="text-lg sm:text-2xl font-bold">{paymentRate}%</div></CardContent></Card>
      </div>

      <Suspense fallback={null}>
        <BillingCharts invoices={invoices} pieData={[
          { name: "Paid", value: paidInvoices.length, color: COLORS.paid },
          { name: "Open", value: openInvoices.length, color: COLORS.open },
          { name: "Void", value: invoices.filter((inv) => inv.status === "void").length, color: COLORS.void },
          { name: "Uncollectible", value: invoices.filter((inv) => inv.status === "uncollectible").length, color: COLORS.uncollectible },
        ]} />
      </Suspense>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Invoices</CardTitle></CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ReceiptIcon className="size-12 mx-auto mb-3 opacity-20" />
              <p>No invoices yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium w-full text-sm">
                <thead><tr><th>Invoice</th><th>Date</th><th>Amount</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {invoices.slice(0, 10).map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">#{inv.number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">₹{(inv.amountPaid / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">{inv.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {inv.pdfUrl && <Button variant="ghost" size="sm" asChild><Link href={inv.pdfUrl} target="_blank"><FileTextIcon className="size-4" /></Link></Button>}
                          {inv.hostedUrl && <Button variant="ghost" size="sm" asChild><Link href={inv.hostedUrl} target="_blank"><ExternalLinkIcon className="size-4" /></Link></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
