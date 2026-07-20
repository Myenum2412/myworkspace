import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";
import { AlertTriangle } from "lucide-react";

export default async function EnterpriseAutomationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [workflowStats, slaReport] = await Promise.all([
    api.getWorkflowStats().catch(() => null),
    api.getSLAReport().catch(() => null),
  ]);

  const slaDefinitions = slaReport?.definitions ?? [
    { priority: "P0", response: "15 min", resolve: "4 hours" },
    { priority: "P1", response: "30 min", resolve: "8 hours" },
    { priority: "P2", response: "2 hours", resolve: "24 hours" },
    { priority: "P3", response: "4 hours", resolve: "72 hours" },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Workflow Automation</h1>
      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="sla">SLA Management</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="workflows" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Define trigger → condition → action chains to automate your workflows</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              {workflowStats && workflowStats.totalWorkflows > 0 ? (
                <p className="text-muted-foreground">{workflowStats.totalWorkflows} workflows configured, {workflowStats.activeWorkflows ?? 0} active.</p>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg mb-2">No workflows configured yet</p>
                  <p className="text-sm">Create automated workflows triggered by task creation, file uploads, schedules, and more. Supported actions: notifications, webhooks, status changes, assignments, escalations, and approvals.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Total Workflows</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{workflowStats?.totalWorkflows ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Active</CardTitle></CardHeader><CardContent><p className={`text-3xl font-bold ${(workflowStats?.activeWorkflows ?? 0) > 0 ? "text-green-500" : ""}`}>{workflowStats?.activeWorkflows ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Executions</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{workflowStats?.totalExecutions ?? 0}</p></CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>SLA Definitions</CardTitle><CardDescription>P0-P3 service level agreements with phase targets</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {slaDefinitions.map((sla: any) => (
                  <Card key={sla.priority} className={sla.priority === "P0" ? "border-red-500" : sla.priority === "P1" ? "border-orange-500" : sla.priority === "P2" ? "border-blue-500" : "border-green-500"}>
                    <CardContent className="pt-4">
                      <p className="font-bold text-lg">{sla.priority}</p>
                      <p className="text-xs text-muted-foreground">Response: {sla.response}</p>
                      <p className="text-xs text-muted-foreground">Resolve: {sla.resolve}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="approvals">
          <Card><CardContent className="pt-6">
            <p className="text-muted-foreground">Approval workflows manage pending requests for tasks, projects, files, and membership changes. Approvers can approve or reject with comments, with configurable required approval counts and expiry timeouts.</p>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="history">
          <Card><CardContent className="pt-6">
            <p className="text-muted-foreground">Workflow execution history with status tracking, action completion metrics, error logging, and execution time analysis.</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
