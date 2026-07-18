"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ReceiptIcon,
  SearchIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  RotateCcwIcon,
  AlertTriangleIcon,
  BanIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableHead } from "@/components/ui/table";
import { toast } from "sonner";

type ReceiptStatus = "paid" | "refunded" | "pending" | "failed" | "cancelled";

interface Receipt {
  id: string;
  receiptNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  customerName: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: ReceiptStatus;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

const STATUS_OPTIONS: { value: ReceiptStatus; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "paid", label: "Paid", icon: <CheckCircleIcon className="size-3.5" />, color: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  { value: "pending", label: "Pending", icon: <AlertTriangleIcon className="size-3.5" />, color: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  { value: "failed", label: "Failed", icon: <XCircleIcon className="size-3.5" />, color: "bg-red-50 text-red-700 ring-red-600/20" },
  { value: "refunded", label: "Refunded", icon: <RotateCcwIcon className="size-3.5" />, color: "bg-blue-50 text-blue-700 ring-blue-600/20" },
  { value: "cancelled", label: "Cancelled", icon: <BanIcon className="size-3.5" />, color: "bg-gray-50 text-gray-600 ring-gray-500/10" },
];

const STATUS_MAP: Record<string, ReceiptStatus> = {
  paid: "paid",
  pending: "pending",
  failed: "failed",
  refunded: "refunded",
  cancelled: "cancelled",
};

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency + " ";
  return symbol + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ReceiptStatusBadge({ status }: { status: ReceiptStatus }) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  if (!opt) return <Badge variant="outline">{status}</Badge>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${opt.color}`}>
      {opt.icon}
      {opt.label}
    </span>
  );
}

import { useBootstrapStore } from "@/stores/bootstrap-store";

export default function ReceiptsPageClient() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const orgId = useBootstrapStore((s) => s.data?.orgId);

  const fetchReceipts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "100");
      params.set("orgId", orgId);
      const res = await fetch(`/api/receipts?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setReceipts(data.data || []);
    } catch {
      setError("Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, orgId]);

  useEffect(() => {
    if (!orgId) return;
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "100");
    params.set("orgId", orgId);
    fetch(`/api/receipts?${params}`, { credentials: "include", signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("Failed to load"); return r.json(); })
      .then((data) => { if (!controller.signal.aborted) setReceipts(data.data || []); })
      .catch(() => { if (!controller.signal.aborted) setError("Failed to load receipts"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [statusFilter, orgId]);

  const handleStatusChange = useCallback(async (id: string, newStatus: ReceiptStatus) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/receipts/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setReceipts((prev) => prev.map((r) => (r.id === id ? { ...r, ...data.data } : r)));
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const filtered = receipts.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.receiptNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      (r.invoiceNumber || "").toLowerCase().includes(q) ||
      r.paymentMethod.toLowerCase().includes(q)
    );
  });

  const totalAmount = receipts.reduce((s, r) => s + r.amount, 0);
  const paidAmount = receipts.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0);
  const pendingCount = receipts.filter((r) => r.status === "pending").length;
  const refundedCount = receipts.filter((r) => r.status === "refunded").length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Receipts</h1>
          <p className="text-sm text-[#64748B] mt-0.5">Manage payment receipts and their status</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchReceipts()} className="gap-1.5">
          <RefreshCwIcon className="size-3.5" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-[#64748B] font-medium">Total Receipts</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-[#0F172A]">{receipts.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-[#64748B] font-medium">Total Amount</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-[#0F172A]">{formatCurrency(totalAmount, "INR")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-[#64748B] font-medium">Collected</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-emerald-600">{formatCurrency(paidAmount, "INR")}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-[#64748B] font-medium">Pending / Refunded</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-[#0F172A]">
              {pendingCount} / {refundedCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative w-full sm:w-64">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94A3B8]" />
          <Input
            placeholder=""
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 pl-9 rounded-xl border-[#E5E7EB]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-36 rounded-xl border-[#E5E7EB]">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex-1 py-16" />
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-red-500 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#94A3B8]">
              <ReceiptIcon className="size-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No receipts found</p>
              <p className="text-xs mt-1">Create an invoice to generate a receipt</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-premium w-full text-sm text-left">
                <thead>
                  <tr>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right w-48">Change Status</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((receipt) => (
                    <tr key={receipt.id} className="hover:bg-[#FAFBFC]">
                      <td>
                        <span className="font-medium text-sm text-[#0F172A]">{receipt.receiptNumber}</span>
                      </td>
                      <td>
                        <div className="text-sm text-[#0F172A]">{receipt.customerName}</div>
                        {receipt.customerEmail && (
                          <div className="text-xs text-[#94A3B8]">{receipt.customerEmail}</div>
                        )}
                      </td>
                      <td className="text-sm text-[#64748B]">
                        {receipt.invoiceNumber || "\u2014"}
                      </td>
                      <td className="text-right text-sm font-semibold text-[#0F172A]">
                        {formatCurrency(receipt.amount, receipt.currency)}
                      </td>
                      <td className="text-sm text-[#64748B]">{receipt.paymentMethod}</td>
                      <td className="text-sm text-[#64748B] whitespace-nowrap">
                        {receipt.createdAt
                          ? new Date(receipt.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "\u2014"}
                      </td>
                      <td>
                        <ReceiptStatusBadge status={receipt.status} />
                      </td>
                      <td className="text-right">
                        <Select
                          value={receipt.status}
                          onValueChange={(val) => handleStatusChange(receipt.id, val as ReceiptStatus)}
                          disabled={updatingId === receipt.id}
                        >
                          <SelectTrigger className="h-9 w-40 rounded-lg border-[#E5E7EB] text-xs ml-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <span className="flex items-center gap-2">
                                  {opt.icon}
                                  {opt.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
