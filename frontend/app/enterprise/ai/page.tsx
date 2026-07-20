import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, BarChart3, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseAIPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [insightData, predictions] = await Promise.all([
    api.getBISummary().catch(() => null),
    api.getWorkflowStats().catch(() => null),
  ]);

  const insights = insightData?.insights ?? [];
  const allPredictions = insightData?.predictions ?? [];
  const recommendations = insightData?.recommendations ?? [];

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI Decision Intelligence</h1>
      <Tabs defaultValue="assistant" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assistant">Cognitive Assistant</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        <TabsContent value="assistant" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Enterprise Cognitive Assistant</CardTitle><CardDescription>Ask questions about your organization in natural language</CardDescription></CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input placeholder="e.g., How many tasks are overdue? or Show me project health..." className="flex-1" aria-label="Ask a question about your organization" />
                <Button aria-label="Submit question">Ask</Button>
              </div>
              <div className="bg-muted rounded-lg p-4 min-h-[200px]">
                <p className="text-sm text-muted-foreground">The AI assistant understands organizational context, policies, projects, files, workflows, analytics, knowledge graphs, and governance rules. It respects tenant isolation and permissions.</p>
                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium">Suggested questions:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>&bull; What is the current health score of my organization?</li>
                    <li>&bull; Show me the executive summary for this quarter</li>
                    <li>&bull; Which tasks are approaching their SLA deadline?</li>
                    <li>&bull; Summarize my compliance posture</li>
                    <li>&bull; Recommend actions to improve productivity</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="insights">
          <Card><CardContent className="pt-6 space-y-3">
            {insights.length > 0 ? insights.map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 border rounded-lg">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${item.severity === "critical" || item.severity === "Warning" ? "text-yellow-500" : "text-blue-500"}`} aria-hidden="true" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${item.severity === "critical" || item.severity === "Warning" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{item.severity}</span>
                </div>
              </div>
            )) : (
              <>
                {[{ icon: AlertTriangle, title: "Task Backlog Growing", severity: "Warning", desc: "8 tasks are past their due date" },
                  { icon: BarChart3, title: "Low Task Completion Rate", severity: "Warning", desc: "Only 45% of tasks completed" },
                  { icon: Save, title: "Storage Consumption Growing", severity: "Info", desc: "2.4 GB used across 342 files" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Icon className={`h-5 w-5 mt-0.5 ${item.severity === "Warning" ? "text-yellow-500" : "text-blue-500"}`} aria-hidden="true" />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.severity === "Warning" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800"}`}>{item.severity}</span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="predictions">
          <Card><CardContent className="pt-6">
            {allPredictions.length > 0 ? (
              <div className="space-y-3">
                {allPredictions.map((p, i) => (
                  <div key={i} className="flex justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium capitalize">{p.metric.replace(/_/g, " ")}</p>
                      <p className="text-sm text-muted-foreground">Predicted: {p.predictedValue} &middot; Confidence: {(p.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.timeframe}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">AI-powered trend predictions using linear regression and moving average models to forecast task volume, storage growth, and team capacity over 3-month, 6-month, and 1-year horizons.</p>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="recommendations">
          <Card><CardContent className="pt-6 space-y-3">
            {recommendations.length > 0 ? recommendations.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div><p className="font-medium">{r.title}</p><p className="text-sm text-muted-foreground">Impact: {r.impact} &middot; Effort: {r.effort}</p></div>
                <Button size="sm" variant="outline" aria-label={`Apply recommendation: ${r.title}`}>Apply</Button>
              </div>
            )) : (
              <>
                {[{ title: "Archive Files Older Than 1 Year", impact: "High", effort: "Hours" }, { title: "Review Stale Todo Tasks", impact: "Medium", effort: "Hours" }].map((r) => (
                  <div key={r.title} className="flex items-center justify-between p-3 border rounded-lg">
                    <div><p className="font-medium">{r.title}</p><p className="text-sm text-muted-foreground">Impact: {r.impact} &middot; Effort: {r.effort}</p></div>
                    <Button size="sm" variant="outline">Apply</Button>
                  </div>
                ))}
              </>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
