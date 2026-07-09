"use client";

import { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileTextIcon, ExternalLinkIcon, Loader2Icon, ClockIcon, CheckCircleIcon, IndianRupee, ReceiptIcon, TrendingUpIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

const BillingCharts = dynamic(() => import("./billing-charts"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Payment Overview</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Monthly Overview</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[220px] w-full rounded-lg" /></CardContent>
      </Card>
    </div>
  ),
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

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) { setError("Failed to load profile"); setLoading(false); return; }
        const profileData = await profileRes.json();
        const oid = profileData?.data?.org?.id;
        if (!oid) { setError("No organization found"); setLoading(false); return; }

        const invRes = await fetch(`/api/billing/invoices?orgId=${oid}`, { credentials: "include" });
        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoices(invData.data?.invoices || []);
        }
      } catch {
        setError("Network error loading billing data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingInvoices = invoices.filter((inv) => inv.status === "open");
  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const voidInvoices = invoices.filter((inv) => inv.status === "void");

  const totalPaid = paidInvoices.reduce((s, inv) => s + inv.amountPaid, 0);
  const totalPending = pendingInvoices.reduce((s, inv) => s + inv.amountPaid, 0);
  const totalRevenue = invoices.reduce((s, inv) => s + inv.amountPaid, 0);

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const thisMonthPaid = paidInvoices
    .filter((inv) => {
      const d = new Date(inv.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((s, inv) => s + inv.amountPaid, 0);

  const pieData = [
    { name: "Paid", value: paidInvoices.length, color: COLORS.paid },
    { name: "Pending", value: pendingInvoices.length, color: COLORS.open },
    { name: "Void", value: voidInvoices.length, color: COLORS.void },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-1 flex-col gap-6 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Billing</h1>
        <Button asChild className="shrink-0 touch-target">
          <Link href="/billing/invoices/new">
            <PlusIcon className="mr-2 size-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <IndianRupee className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{(totalPaid / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Across {paidInvoices.length} paid invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <ClockIcon className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{(totalPending / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{pendingInvoices.length} pending invoices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUpIcon className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{(thisMonthPaid / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Revenue this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <ReceiptIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{invoices.length}</p>
            <p className="text-xs text-muted-foreground">
              {paidInvoices.length} paid &middot; {pendingInvoices.length} pending &middot; {voidInvoices.length} void
            </p>
          </CardContent>
        </Card>
      </div>

      <Suspense fallback={null}>
        <BillingCharts invoices={invoices} pieData={pieData} />
      </Suspense>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClockIcon className="size-5 text-amber-500 shrink-0" />
              <CardTitle>Pending Payment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvoices.length === 0 ? (
              <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                No pending payments
              </div>
            ) : (
              <div className="space-y-2">
                {pendingInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{inv.number || inv.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{(inv.amountPaid / 100).toFixed(2)} &middot; {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">Open</span>
                      {inv.hostedUrl && (
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="size-8">
                            <ExternalLinkIcon className="size-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/billing/invoices")}>
              View All Pending
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="size-5 text-emerald-500" />
              <CardTitle>Paid Payment</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {paidInvoices.length === 0 ? (
              <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                No paid payments yet
              </div>
            ) : (
              <div className="space-y-2">
                {paidInvoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{inv.number || inv.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{(inv.amountPaid / 100).toFixed(2)} &middot; {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Paid</span>
                      {inv.hostedUrl && (
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="size-8">
                            <ExternalLinkIcon className="size-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/billing/invoices")}>
              View All Paid
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
