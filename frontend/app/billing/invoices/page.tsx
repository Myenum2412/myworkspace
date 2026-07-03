"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileTextIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";

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
      <h1 className="text-2xl font-bold">Invoices</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-5 text-muted-foreground" />
            <CardTitle>Invoice History</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-lg border p-8 text-center text-sm text-destructive">{error}</div>
          )}
          {!error && invoices.length === 0 && (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              No invoices yet
            </div>
          )}
          {invoices.length > 0 && (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-1">
                    <p className="font-medium">{inv.number || inv.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      ${(inv.amountPaid / 100).toFixed(2)} {inv.currency.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.createdAt).toLocaleDateString()} &middot;{" "}
                      {inv.status === "paid" ? "Paid" : inv.status === "open" ? "Open" : inv.status === "void" ? "Void" : inv.status}
                    </p>
                    {inv.periodStart && (
                      <p className="text-xs text-muted-foreground">
                        Period: {new Date(inv.periodStart).toLocaleDateString()} &ndash; {new Date(inv.periodEnd).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.pdfUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <FileTextIcon className="size-4 mr-1" />
                          PDF
                        </a>
                      </Button>
                    )}
                    {inv.hostedUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLinkIcon className="size-4 mr-1" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
