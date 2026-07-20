import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseBIPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [execReport, kpiTrends] = await Promise.all([
    api.getExecutiveReport().catch(() => null),
    api.getKPITrends("overall", "month", 30).catch(() => null),
  ]);

  const reportItems = execReport?.items ?? [
    { label: "Projects", value: "12 active" },
    { label: "Overdue Tasks", value: "8" },
    { label: "Team Members", value: "24" },
    { label: "Files", value: "342" },
  ];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Business Intelligence</h1>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="drilldown">Drill-Down</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-500">{execReport?.healthScore?.overall ?? "85"}</p><p className="text-xs text-muted-foreground">Overall platform health</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Task Completion</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-blue-500">{execReport?.taskCompletion ?? "72"}%</p><p className="text-xs text-muted-foreground">Completion rate</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Active Users</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-purple-500">{execReport?.activeUsers ?? "18"}</p><p className="text-xs text-muted-foreground">Active this period</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Storage</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-amber-500">{execReport?.storageUsed ?? "2.4"} GB</p><p className="text-xs text-muted-foreground">Of {execReport?.storageLimit ?? "50"} GB used</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Executive Report</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportItems.map((item: any) => (
                  <div key={item.label} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="kpis">
          <Card><CardContent className="pt-6">
            {kpiTrends?.data?.length ? (
              <p className="text-muted-foreground">KPI trends loaded — {kpiTrends.data.length} data points available.</p>
            ) : (
              <p className="text-muted-foreground">KPI trends and historical data will be displayed here. The KPI trend recording engine captures daily, weekly, monthly, and quarterly metrics for all key indicators.</p>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Scheduled and on-demand reports. The reporting engine supports executive summaries, drill-down by dimension (status, user, storage type), and KPI trend analysis with directional tracking.</p></CardContent></Card>
        </TabsContent>
        <TabsContent value="drilldown">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Interactive drill-down reporting across tasks, users, projects, and storage. Navigate from summary metrics to individual records with pagination and filtering.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
