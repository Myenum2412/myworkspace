import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCardIcon, FileTextIcon, SparklesIcon } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let plan = "free";

  if (orgId) {
    const org = await db.collection(collections.organizations).findOne(
      { id: orgId },
      { projection: { plan: 1 } }
    ) as { plan?: string } | null;
    if (org?.plan) plan = org.plan;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-4">
      <h1 className="text-2xl font-bold">Billing</h1>

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
            <Button variant="outline" size="sm" asChild>
              <a href="/billing/plans">View Plans</a>
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
              <p className="text-sm font-medium">No payment method on file</p>
            </div>
            <Button variant="outline" size="sm">Add payment method</Button>
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
            <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No invoices yet
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="/billing/invoices">View All</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
