"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileViewer, type ViewerFile } from "@/components/ui/file-viewer";
import {
  ReceiptIcon,
  DownloadIcon,
  EyeIcon,
  ArrowLeftIcon,
  AlertCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
} from "lucide-react";

type InvoiceData = {
  id: string;
  number: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string;
  hostedUrl: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
};

type BillingData = {
  plan: string;
  invoices: InvoiceData[];
};

function formatCurrency(amount: number, currency: string = "INR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  paid: CheckCircle2Icon,
  open: ClockIcon,
  past_due: AlertCircleIcon,
  void: AlertCircleIcon,
  uncollectible: AlertCircleIcon,
};

const STATUS_COLORS: Record<string, string> = {
  paid: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
  open: "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
  past_due: "text-red-600 bg-red-50 dark:bg-red-950/30",
  void: "text-gray-500 bg-gray-50 dark:bg-gray-800/50",
  uncollectible: "text-gray-500 bg-gray-50 dark:bg-gray-800/50",
};

export default function ClientBillsPage() {
  const router = useRouter();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("client_token") || "";
    if (!token) {
      router.push("/client/login");
      return;
    }

    fetch("/api/client-auth/billing-status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || "Failed to load billing data");
        }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [router]);

  const invoices = useMemo(() => {
    if (!data?.invoices) return [];
    return data.invoices.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [data]);

  const handleViewInvoice = (inv: InvoiceData) => {
    if (!inv.pdfUrl) return;
    setViewerFile({
      url: inv.pdfUrl,
      name: `Invoice_${inv.number || inv.id}.pdf`,
      mimeType: "application/pdf",
      size: 0,
    });
    setViewerOpen(true);
  };

  const handleDownloadInvoice = (inv: InvoiceData) => {
    if (!inv.pdfUrl) return;
    const a = document.createElement("a");
    a.href = inv.pdfUrl;
    a.download = `Invoice_${inv.number || inv.id}.pdf`;
    a.click();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <AlertCircleIcon className="size-10 text-destructive" />
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeftIcon className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Bills & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.plan ? `${data.plan.charAt(0).toUpperCase() + data.plan.slice(1)} plan` : ""}
            {invoices.length > 0 ? ` · ${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <ReceiptIcon className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">No invoices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const StatusIcon = STATUS_ICONS[inv.status] || ClockIcon;
            const statusColor = STATUS_COLORS[inv.status] || "text-gray-500 bg-gray-50 dark:bg-gray-800/50";
            return (
              <Card key={inv.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${statusColor}`}>
                        <StatusIcon className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            Invoice #{inv.number || `INV-${inv.id.slice(0, 5).toUpperCase()}`}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
                            {inv.status ? inv.status.charAt(0).toUpperCase() + inv.status.slice(1) : "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {formatDate(inv.createdAt)}
                          {inv.periodStart && inv.periodEnd && (
                            <> · {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                      <span className="font-semibold text-sm sm:mr-2">
                        {formatCurrency(inv.amountDue, inv.currency)}
                      </span>
                      {inv.pdfUrl && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => handleViewInvoice(inv)} title="View">
                            <EyeIcon className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadInvoice(inv)} title="Download">
                            <DownloadIcon className="size-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FileViewer file={viewerFile} open={viewerOpen} onOpenChange={setViewerOpen} />
    </div>
  );
}
