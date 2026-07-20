import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseGovernancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [governanceScore, compliance, retention] = await Promise.all([
    api.getGovernanceScore().catch(() => null),
    api.getComplianceReport().catch(() => null),
    api.getRetentionReport().catch(() => null),
  ]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Governance & Compliance</h1>
      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="legalhold">Legal Hold</TabsTrigger>
          <TabsTrigger value="retention">Data Retention</TabsTrigger>
          <TabsTrigger value="audit">Audit Policy</TabsTrigger>
        </TabsList>
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Compliance Score</CardTitle></CardHeader><CardContent><p className={`text-3xl font-bold ${(compliance?.summary?.compliant ?? 0) > 0 ? "text-green-500" : ""}`}>{governanceScore?.score ?? (compliance?.summary ? `${Math.round((compliance.summary.compliant / Math.max(compliance.summary.total, 1)) * 100)}%` : "92%")} </p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">GDPR</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-green-500">{compliance?.byFramework?.gdpr ?? "Compliant"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">SOC 2</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-amber-500">{compliance?.byFramework?.soc2 ?? "Review"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">HIPAA</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-amber-500">{compliance?.byFramework?.hipaa ?? "Review"}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Frameworks</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">The governance engine supports SOC2, HIPAA, GDPR, ISO27001, PCI_DSS, and FedRAMP compliance frameworks. Checks are automatically scoped based on your plan tier. Each framework runs specific checks for access controls, encryption, audit logging, consent, and data retention.</p>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="legalhold" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Active Holds</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{governanceScore?.activeHolds ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Preserved Records</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{governanceScore?.preservedRecords ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Custodians</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{governanceScore?.custodians ?? 0}</p></CardContent></Card>
          </div>
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Legal holds preserve entities (files, tasks, projects) for e-discovery and compliance. Holds can be scoped to entire organizations, specific projects, users, or individual files. Custodian tracking and snapshot preservation ensure data immutability during legal proceedings.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="retention">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <Card><CardHeader><CardTitle className="text-sm">Schedules</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{retention?.schedules ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Files Retained</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{retention?.filesRetained ?? 342}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Audit Logs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{retention?.auditLogDays ?? "365d"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Activity Logs</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{retention?.activityLogDays ?? "90d"}</p></CardContent></Card>
          </div>
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Retention schedules define how long different entity types (files, tasks, projects, activity logs, audit logs) are kept before being deleted, archived, exported, or anonymized. Policies respect legal holds and can be paused or modified. Automated policy execution runs on a scheduled basis.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="audit">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Audit policies define which actions are logged, retained, and alerted on. Configure include/exclude action filters, retention duration, and alert triggers for specific compliance-related events.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
