import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [summary, usage, lifecycle] = await Promise.all([
    api.getOrgSummary().catch(() => null),
    api.getUsageAnalytics("day", 30).catch(() => null),
    api.getLifecycleOverview().catch(() => null),
  ]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Tenant Administration</h1>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Total Orgs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary?.organization ? 1 : "-"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Total Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary?.usage?.users ?? "-"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Total Projects</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary?.usage?.projects ?? "-"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Total Tasks</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary?.usage?.tasks ?? "-"}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Tenant Configuration</CardTitle></CardHeader>
            <CardContent>
              {summary?.config ? (
                <div className="space-y-3">
                  {Object.entries(summary.config).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 border-b last:border-0">
                      <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">Per-tenant configuration covers branding (logo, colors, company name), feature flags (individually toggleable), quotas (storage, users, projects, tasks), security policies (password rules, session timeout, 2FA, IP whitelisting), localization (timezone, date format, currency, language), and data retention policies (audit logs, activity logs, deleted files, sessions).</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="usage">
          <Card><CardContent className="pt-6">
            {usage?.snapshots?.length ? (
              <p className="text-muted-foreground">Usage analytics loaded — {usage.snapshots.length} data points available.</p>
            ) : (
              <p className="text-muted-foreground">Usage analytics provide per-tenant metrics and trends across all dimensions — tasks created/completed, files uploaded, projects created, logins, and user growth. The analytics engine captures hourly, daily, weekly, and monthly snapshots and detects anomalies using 2-sigma deviation analysis.</p>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="lifecycle">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {[{ stage: "Active", count: lifecycle?.active ?? "-", color: "text-green-500" }, { stage: "Trial", count: lifecycle?.trial ?? "-", color: "text-blue-500" }, { stage: "Suspended", count: lifecycle?.suspended ?? "-", color: "text-red-500" }, { stage: "Cancelled", count: lifecycle?.cancelled ?? "-", color: "text-gray-500" }, { stage: "Expiring", count: lifecycle?.expiring ?? "-", color: "text-amber-500" }].map((item) => (
              <Card key={item.stage}><CardContent className="pt-4 text-center"><p className={`text-2xl font-bold ${item.color}`}>{item.count}</p><p className="text-xs text-muted-foreground">{item.stage}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">The lifecycle manager tracks tenant stages from provisioning through trial, active, suspended, cancelled, and archived. Trial expiry monitoring, suspension triggers, and automated cleanup at end-of-life ensure efficient resource management.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="config">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Per-tenant configuration covers branding (logo, colors, company name), feature flags (individually toggleable), quotas (storage, users, projects, tasks), security policies (password rules, session timeout, 2FA, IP whitelisting), localization (timezone, date format, currency, language), and data retention policies (audit logs, activity logs, deleted files, sessions).</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
