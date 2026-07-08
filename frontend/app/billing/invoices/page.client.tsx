"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PlusIcon, ReceiptIcon, CheckCircleIcon, ClockIcon, IndianRupee, Loader2Icon,
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

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) { setLoading(false); setError("Failed to load profile"); return; }
        const profileData = await profileRes.json();
        const oid = profileData?.data?.org?.id;
        if (!oid) { setLoading(false); setError("No organization found"); return; }

        const res = await fetch(`/api/billing/invoices?orgId=${oid}`, { credentials: "include" });
        if (!res.ok) { setLoading(false); setError("Failed to load invoices"); return; }
        const data = await res.json();
        setInvoices(data.data?.invoices || []);
      } catch {
        setError("Network error loading invoices");
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
  const totalPaid = paidInvoices.reduce((s, inv) => s + inv.amountPaid, 0);
  const totalPending = openInvoices.reduce((s, inv) => s + inv.amountPaid, 0);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">Manage your organization's invoices</p>
        </div>
        <Button asChild className="shrink-0 touch-target">
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

      <Card>
        <CardHeader><CardTitle className="text-base">All Invoices</CardTitle></CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={invoices}
            renderMobileCard={(inv: Invoice) => (
              <div className="border rounded-lg bg-card p-3 sm:p-4 space-y-2 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 truncate">{inv.number || inv.id.slice(0, 8)}</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium shrink-0 ${
                    inv.status === "paid" ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20" :
                    inv.status === "open" ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10" :
                    "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                  }`}>
                    {inv.status === "paid" ? "Paid" : inv.status === "open" ? "Pending" : "Void"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground truncate">{inv.customerName || "\u2014"}</span>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">
                    ₹{(inv.amountPaid / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "\u2014"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="size-7">
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.location.href = `/billing/invoices/${inv.id}`}>
                        <PencilIcon className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          if (!inv.pdfUrl) { e.preventDefault(); generateInvoicePDF(inv); }
                        }}
                        asChild={!!inv.pdfUrl}
                      >
                        {inv.pdfUrl ? (
                          <a href={inv.pdfUrl} download={`Invoice_${inv.number || inv.id}.pdf`}>
                            <DownloadIcon className="mr-2 size-4" />
                            Download PDF
                          </a>
                        ) : (
                          <div className="flex items-center cursor-pointer w-full">
                            <DownloadIcon className="mr-2 size-4" />
                            Download PDF
                          </div>
                        )}
                      </DropdownMenuItem>
                      {inv.hostedUrl && (
                        <DropdownMenuItem onClick={() => window.open(inv.hostedUrl, "_blank")}>
                          <ExternalLinkIcon className="mr-2 size-4" />
                          Open Hosted
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this invoice?")) {
                            await fetch(`/api/billing/invoices/${inv.id}`, { method: "DELETE" });
                            window.location.reload();
                          }
                        }}
                      >
                        <Trash2Icon className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
