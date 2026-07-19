"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusIcon, ReceiptIcon, CheckCircleIcon, ClockIcon, IndianRupee,
  MoreHorizontalIcon, PencilIcon, Trash2Icon, DownloadIcon, ExternalLinkIcon, FileTextIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { DataTable } from "./data-table";
import { columns, type Invoice } from "./columns";
import { generateInvoicePDF } from "@/lib/pdf";
import { useBootstrapStore } from "@/stores/bootstrap-store";

function InvoiceStatsCard({ icon, label, value, valueClassName, subtitle }: { icon: React.ReactNode; label: string; value: string | number; valueClassName?: string; subtitle?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClassName || ""}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function BillingInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const orgId = useBootstrapStore((s) => s.data?.orgId);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/billing/invoices?orgId=${orgId}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) { setLoading(false); setError("Failed to load invoices"); return; }
        const data = await res.json();
        setInvoices(data.data?.invoices || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Network error loading invoices");
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

  const paidInvoices = invoices.filter((inv) => inv.status === "paid");
  const openInvoices = invoices.filter((inv) => inv.status === "open");
  const voidInvoices = invoices.filter((inv) => inv.status === "void");
  const totalPaid = paidInvoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);
  const totalPending = openInvoices.reduce((s, inv) => s + (inv.amountPaid || 0), 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage your organization's invoices</p>
        </div>
        <Button asChild>
          <Link href="/billing/invoices/new">
            <PlusIcon className="mr-2 size-4" />
            New Invoice
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <InvoiceStatsCard
          icon={<ReceiptIcon className="size-4" />}
          label="Total Invoices"
          value={invoices.length}
        />
        <InvoiceStatsCard
          icon={<CheckCircleIcon className="size-4" />}
          label="Paid Invoices"
          value={paidInvoices.length}
          valueClassName="text-emerald-500"
          subtitle={<span className="text-emerald-600 font-medium">₹{(totalPaid / 100).toFixed(2)} collected</span>}
        />
        <InvoiceStatsCard
          icon={<ClockIcon className="size-4" />}
          label="Pending Payment"
          value={openInvoices.length}
          valueClassName="text-blue-500"
          subtitle={<span className="text-blue-600 font-medium">₹{(totalPending / 100).toFixed(2)} pending</span>}
        />
        <InvoiceStatsCard
          icon={<IndianRupee className="size-4" />}
          label="Cancelled / Void Invoices"
          value={voidInvoices.length}
        />
      </div>

      <DataTable
        columns={columns}
        data={invoices}
      />
    </div>
  );
}
