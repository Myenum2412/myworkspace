"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusIcon, FileTextIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  MoreHorizontalIcon, PencilIcon, Trash2Icon, DownloadIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useBootstrapStore } from "@/stores/bootstrap-store";
import { Badge } from "@/components/ui/badge";

type Quotation = {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  reference: string;
  quotationDate: string;
  expiryDate: string;
  total: number;
  status: string;
  createdAt: string;
};

function QuotationStatsCard({ icon, label, value, valueClassName }: { icon: React.ReactNode; label: string; value: string | number; valueClassName?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function statusBadge(status: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    draft: "secondary",
    sent: "default",
    accepted: "outline",
    rejected: "destructive",
    expired: "destructive",
  };
  return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
}

export default function QuotationsPageClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const orgId = useBootstrapStore((s) => s.data?.orgId);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/billing/quotations?orgId=${orgId}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) { setLoading(false); setError("Failed to load quotations"); return; }
        const data = await res.json();
        setQuotations(data.data?.quotations || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error loading quotations");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [orgId]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center p-4" />;
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-destructive">
        {error}
      </div>
    );
  }

  const draftQuotations = quotations.filter((q) => q.status === "draft");
  const sentQuotations = quotations.filter((q) => q.status === "sent");
  const acceptedQuotations = quotations.filter((q) => q.status === "accepted");
  const totalValue = quotations.reduce((s, q) => s + (q.total || 0), 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Quotations</h1>
          <p className="text-sm text-muted-foreground">Manage your organization's quotations</p>
        </div>
        <Button asChild>
          <Link href="/billing/quotations/new">
            <PlusIcon className="mr-2 size-4" />
            New Quotation
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <QuotationStatsCard
          icon={<FileTextIcon className="size-4" />}
          label="Total Quotations"
          value={quotations.length}
        />
        <QuotationStatsCard
          icon={<ClockIcon className="size-4" />}
          label="Draft"
          value={draftQuotations.length}
          valueClassName="text-amber-500"
        />
        <QuotationStatsCard
          icon={<CheckCircleIcon className="size-4" />}
          label="Accepted"
          value={acceptedQuotations.length}
          valueClassName="text-emerald-500"
        />
        <QuotationStatsCard
          icon={<FileTextIcon className="size-4" />}
          label="Total Value"
          value={`₹${(totalValue / 100).toFixed(2)}`}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {quotations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <FileTextIcon className="size-12 text-muted-foreground/20" />
              <p className="text-sm font-medium">No quotations yet</p>
              <p className="text-xs">Create your first quotation to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Quotation</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Expiry</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">#{q.number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{q.customerName || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {q.quotationDate ? new Date(q.quotationDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {q.expiryDate ? new Date(q.expiryDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">₹{((q.total || 0) / 100).toFixed(2)}</td>
                      <td className="px-4 py-3">{statusBadge(q.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/billing/quotations/${q.id}`}>
                                <PencilIcon className="size-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2Icon className="size-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
