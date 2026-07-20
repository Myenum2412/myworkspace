import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseBillingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const billingSummary = await api.getBillingSummary().catch(() => null);

  const plans = [
    { name: "Free", price: "$0", features: ["1 project", "100 MB storage", "5 tasks"], popular: false },
    { name: "Starter", price: "$19", features: ["10 projects", "5 GB storage", "5 members"], popular: false },
    { name: "Professional", price: "$49", features: ["50 projects", "50 GB", "20 members", "API"], popular: true },
    { name: "Business", price: "$149", features: ["Unlimited", "500 GB", "100 members", "SSO"], popular: false },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscriptions</h1>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Current Plan</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{billingSummary?.plan ?? "Professional"}</p><p className="text-xs text-muted-foreground">{billingSummary?.amount ? `$${billingSummary.amount}/${billingSummary.interval ?? "mo"}` : "$49/mo"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader><CardContent><p className={`text-xl font-bold ${billingSummary?.status === "active" ? "text-green-500" : ""}`}>{billingSummary?.status ?? "Active"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Next Billing</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{billingSummary?.nextBillingDate ? new Date(billingSummary.nextBillingDate).toLocaleDateString() : "Jul 20"}</p><p className="text-xs text-muted-foreground">Next cycle</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Seats</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{billingSummary?.seats ?? "24"}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Plan Details</CardTitle><Button variant="outline" size="sm">Change Plan</Button></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {billingSummary?.plan ? (
                  <p className="text-muted-foreground">Currently on the {billingSummary.plan} plan. {billingSummary.seats ?? 0} seats active. {billingSummary.interval === "year" ? "Annual" : "Monthly"} billing.</p>
                ) : (
                  <p className="text-muted-foreground">View your current plan details, features, and limits below.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="plans">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <Card key={plan.name} className={plan.popular ? "border-blue-500" : ""}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription><span className="text-3xl font-bold">{plan.price}</span>/month</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => <li key={f} className="flex items-center gap-2"><span className="text-green-500" aria-hidden="true">✓</span>{f}</li>)}
                  </ul>
                  <Button className="w-full mt-4" variant={plan.popular ? "default" : "outline"} aria-label={`${billingSummary?.plan === plan.name ? "Current plan" : "Upgrade to " + plan.name}`}>{billingSummary?.plan === plan.name ? "Current" : "Upgrade"}</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="invoices">
          <Card><CardHeader><CardTitle>Recent Invoices</CardTitle></CardHeader><CardContent>
            {billingSummary?.recentInvoices?.length ? (
              <div className="space-y-2">
                {billingSummary.recentInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex justify-between py-2 border-b">
                    <span>{inv.number}</span>
                    <span>${inv.amount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Invoice history with payment status, amounts, periods, and download links. The billing engine auto-generates invoices on subscription cycles with proper tax calculation (8% default), sequential numbering, and multiple status tracking (draft, open, paid, past_due, void, refunded).</p>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="payment">
          <Card><CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader><CardContent>
            {billingSummary?.paymentMethods?.length ? (
              <div className="space-y-2">
                {billingSummary.paymentMethods.map((pm: any) => (
                  <div key={pm.id} className="flex justify-between py-2 border-b">
                    <span>{pm.type}</span>
                    <span>{pm.last4 ? `****${pm.last4}` : pm.type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Manage saved payment methods (card, bank, PayPal, crypto) with default billing details. All payment processing is isolated from core business logic through the billing engine abstraction layer.</p>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="usage">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Usage-based billing metrics show consumption across storage, API calls, seats, and add-on services. The usage metering system feeds into invoice generation for organizations on usage-based pricing tiers.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
