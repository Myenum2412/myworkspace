import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCardIcon, FileTextIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };

const getBillingData = cache(async (orgId: string) => {
  const [invoices, subscriptions, org] = await Promise.all([
    db.collection(collections.invoices).find({ orgId }).sort({ createdAt: -1 }).limit(10).toArray(),
    db.collection(collections.subscriptions).findOne({ orgId }),
    db.collection(collections.organizations).findOne({ id: orgId }),
  ]);
  return { invoices, subscription: subscriptions, plan: (org?.plan as string) || "free" };
});

const getAllBillingData = cache(async () => {
  const [invoices, subscriptions] = await Promise.all([
    db.collection(collections.invoices).find({}).sort({ createdAt: -1 }).limit(10).toArray(),
    db.collection(collections.subscriptions).find({}).toArray(),
  ]);
  return { invoices, subscriptions, plan: "all" };
});

export default async function BillingPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const billing = isSuperAdmin ? await getAllBillingData() : await getBillingData(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCardIcon className="size-5 text-muted-foreground" />
              <CardTitle>Payment Method</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {billing.subscription ? (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium capitalize">{(billing.subscription as Record<string, unknown>).plan as string || billing.plan} Plan</p>
                <p className="text-xs text-muted-foreground">Status: {(billing.subscription as Record<string, unknown>).status as string || "active"}</p>
              </div>
            ) : (
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium">Free Plan</p>
                <p className="text-xs text-muted-foreground">No payment method on file</p>
              </div>
            )}
            <Button variant="outline" size="sm">Update payment method</Button>
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
            {billing.invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              billing.invoices.map((inv) => (
                <div key={(inv._id as { toString: () => string }).toString()} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{inv.description || inv.period || "Invoice"}</p>
                    <p className="text-xs text-muted-foreground">{inv.amount ? `$${(inv.amount / 100).toFixed(2)}` : ""} &middot; {inv.status || "pending"}</p>
                  </div>
                  <Button variant="ghost" size="sm">Download</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
