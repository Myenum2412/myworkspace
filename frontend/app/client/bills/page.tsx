"use client";

import { useState, useEffect } from "react";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

type Invoice = {
  id: string;
  number: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string;
  createdAt: string;
};

const statusStyles: Record<string, string> = {
  paid: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400",
  open: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
  void: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400",
};

const columns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "number",
    header: "Invoice",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.number || `INV-${row.original.id.slice(0, 5).toUpperCase()}`}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Date",
    cell: ({ row }) => {
      const val = row.getValue("createdAt") as string;
      if (!val) return <span className="text-muted-foreground">—</span>;
      try {
        return <span className="text-sm tabular-nums">{new Date(val).toLocaleDateString()}</span>;
      } catch {
        return <span className="text-sm">{val}</span>;
      }
    },
  },
  {
    accessorKey: "amountDue",
    header: "Amount",
    cell: ({ row }) => {
      const inv = row.original;
      return (
        <span className="block text-right text-sm font-semibold tabular-nums">
          {(inv.currency === "INR" ? "\u20B9" : "$")}
          {((inv.amountDue || 0) / 100).toFixed(2)}
        </span>
      );
    },
  },
  {
    accessorKey: "status",
    enableSorting: false,
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const label = status === "paid" ? "Paid" : status === "open" ? "Pending" : status === "void" ? "Void" : status;
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status] || "bg-gray-100 text-gray-700"}`}>
          {label}
        </span>
      );
    },
  },
];

export default function ClientBillsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const token = localStorage.getItem("client_token") || "";

    fetch("/api/client-auth/billing-status", {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.invoices) {
          setInvoices(res.data.invoices);
        } else {
          setError(res.error || "Failed to load billing data");
        }
      })
      .catch((err) => { if (err.name !== "AbortError") setError("Network error"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
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
      <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircleIcon className="size-10 text-destructive" />
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-xl sm:text-2xl font-bold">Bills</h1>
      <DataTable
        columns={columns}
        data={invoices}
        searchPlaceholder="Search invoices..."
        label="invoice(s)"
        emptyMessage="No invoices found."
      />
    </div>
  );
}
