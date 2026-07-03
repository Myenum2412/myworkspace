"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCardIcon, FileTextIcon, SparklesIcon, ExternalLinkIcon, Loader2Icon } from "lucide-react";

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch("/api/user/profile");
        if (!profileRes.ok) { setError("Failed to load profile"); setLoading(false); return; }
        const profileData = await profileRes.json();
        const oid = profileData?.data?.org?.id;
        if (!oid) { setError("No organization found"); setLoading(false); return; }
        setOrgId(oid);

        const [subRes, invRes] = await Promise.all([
          fetch(`/api/billing/subscription?orgId=${oid}`, { credentials: "include" }),
          fetch(`/api/billing/invoices?orgId=${oid}`, { credentials: "include" }),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData.data);
        }

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoices(invData.data?.invoices?.slice(0, 5) || []);
        }
      } catch {
        setError("Network error loading billing data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handlePortal() {
    if (!orgId) return;
    try {
      const res = await fetch("/api/billing/portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) { setError("Failed to open billing portal"); return; }
      const data = await res.json();
      if (data.data?.url) window.location.href = data.data.url;
    } catch {
      setError("Network error opening billing portal");
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const plan = subscription?.plan || "free";
  const hasPayment = subscription?.stripeCustomerId ? true : false;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <h1 className="text-2xl font-bold">Billing</h1>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-5 text-muted-foreground" />
              <CardTitle>Current Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground capitalize">{plan}</p>
            <Button variant="outline" size="sm" onClick={() => router.push("/billing/plans")}>
              View Plans
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCardIcon className="size-5 text-muted-foreground" />
              <CardTitle>Payment Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">
                {hasPayment ? "Payment method on file" : "No payment method on file"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePortal} disabled={!hasPayment}>
              {hasPayment ? (
                <>Manage <ExternalLinkIcon className="size-3 ml-1" /></>
              ) : (
                "Add payment method"
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-5 text-muted-foreground" />
              <CardTitle>Invoices</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.length === 0 ? (
              <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
                No invoices yet
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">{inv.number || inv.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${(inv.amountPaid / 100).toFixed(2)} &middot; {new Date(inv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {inv.hostedUrl && (
                      <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="size-8">
                          <ExternalLinkIcon className="size-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/billing/invoices")}>
              View All
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
