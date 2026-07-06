"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ExternalLinkIcon, Loader2Icon, PlusCircleIcon } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button asChild>
          <Link href="/billing/invoices/new">
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </div>
      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col rounded-lg">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left border-collapse" style={{ minWidth: 800 }}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#f3f4f6] text-gray-900">
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Invoice</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Date</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Amount</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Status</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Period</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 bg-white text-sm text-destructive">{error}</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                        <FileTextIcon className="size-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">No invoices yet</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3 align-middle font-medium text-gray-900">
                      {inv.number || inv.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 align-middle text-gray-500">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 align-middle text-gray-700">
                      ${(inv.amountPaid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Paid</span>
                      ) : inv.status === "open" ? (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">Open</span>
                      ) : inv.status === "void" ? (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">Void</span>
                      ) : (
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">{inv.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-gray-500">
                      {inv.periodStart ? (
                        `${new Date(inv.periodStart).toLocaleDateString()} - ${new Date(inv.periodEnd).toLocaleDateString()}`
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        {inv.pdfUrl && (
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                              <FileTextIcon className="size-3.5 mr-1" />
                              PDF
                            </a>
                          </Button>
                        )}
                        {inv.hostedUrl && (
                          <Button variant="outline" size="sm" asChild className="h-8">
                            <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLinkIcon className="size-3.5 mr-1" />
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
