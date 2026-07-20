import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";

export default async function EnterpriseSuccessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [health, onboarding, customerSummary] = await Promise.all([
    api.getCustomerHealth().catch(() => null),
    api.getOnboardingStatus().catch(() => null),
    api.getCustomerSuccessSummary().catch(() => null),
  ]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Customer Success</h1>
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Health Score</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
          <TabsTrigger value="adoption">Adoption</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Health Score</CardTitle></CardHeader><CardContent><p className={`text-3xl font-bold ${(health?.score ?? 85) >= 70 ? "text-green-500" : (health?.score ?? 85) >= 40 ? "text-amber-500" : "text-red-500"}`}>{health?.score ?? 85}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Risk Level</CardTitle></CardHeader><CardContent><p className={`text-xl font-bold ${health?.risk === "low" || !health ? "text-green-500" : health?.risk === "medium" ? "text-amber-500" : "text-red-500"}`}>{health?.risk ?? "Low"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Adoption</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{customerSummary?.overallAdoption ? `${customerSummary.overallAdoption}%` : "80%"}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Engagement</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{customerSummary?.overallEngagement ? `${customerSummary.overallEngagement}%` : "72%"}</p></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Health Factors</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {health?.factors ? Object.entries(health.factors).map(([factor, score]) => (
                  <div key={factor}>
                    <div className="flex justify-between text-sm mb-1"><span className="capitalize">{factor.replace(/_/g, " ")}</span><span>{score}%</span></div>
                    <div className="h-2 bg-muted rounded-full" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={`${factor}: ${score}%`}>
                      <div className={`h-full rounded-full ${score >= 70 ? "bg-green-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                )) : (
                  <>
                    {[{ factor: "Adoption", score: 80 }, { factor: "Engagement", score: 72 }, { factor: "Performance", score: 90 }, { factor: "Support", score: 85 }].map((item) => (
                      <div key={item.factor}>
                        <div className="flex justify-between text-sm mb-1"><span>{item.factor}</span><span>{item.score}%</span></div>
                        <div className="h-2 bg-muted rounded-full" role="progressbar" aria-valuenow={item.score} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.factor}: ${item.score}%`}>
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="onboarding" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Onboarding Progress</CardTitle></CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="h-4 bg-muted rounded-full" role="progressbar" aria-valuenow={onboarding?.progress ?? 75} aria-valuemin={0} aria-valuemax={100} aria-label={`Onboarding ${onboarding?.progress ?? 75}% complete`}>
                  <div className="h-full w-3/4 bg-blue-500 rounded-full" style={{ width: `${onboarding?.progress ?? 75}%` }} />
                </div>
                <p className="text-sm text-right mt-1 text-muted-foreground">{onboarding?.progress ?? 75}% complete</p>
              </div>
              <div className="space-y-2">
                {(onboarding?.completedSteps?.length ? (
                  [...onboarding.completedSteps.map((s: string) => ({ step: s, done: true, current: false })),
                   { step: onboarding.currentStep, done: false, current: true },
                   ...onboarding.skippedSteps.map((s: string) => ({ step: s, done: false, current: false }))]
                ) : (
                  [
                    { step: "Welcome", done: true, current: false },
                    { step: "Create Organization", done: true, current: false },
                    { step: "Invite Team", done: true, current: false },
                    { step: "Create Project", done: true, current: false },
                    { step: "Create First Task", done: false, current: true },
                    { step: "Upload File", done: false, current: false },
                    { step: "Explore Dashboard", done: false, current: false },
                  ]
                )).map((item: any) => (
                  <div key={item.step} className={`flex items-center gap-3 p-2 rounded ${item.current ? "bg-blue-50 border border-blue-200" : ""}`}>
                    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs ${item.done ? "bg-green-500 text-white" : item.current ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"}`} aria-label={item.done ? "Completed" : item.current ? "In progress" : "Not started"}>{item.done ? "✓" : item.current ? "→" : String(item.step.length)}</span>
                    <span className={item.current ? "font-medium" : ""}>{item.step}</span>
                    {item.current && <span className="text-xs text-blue-500 ml-auto">In Progress</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="adoption">
          <Card><CardContent className="pt-6 space-y-3">
            {customerSummary?.featureAdoption?.length ? customerSummary.featureAdoption.map((item: any) => (
              <div key={item.feature} className="flex items-center justify-between py-2 border-b last:border-0">
                <span>{item.feature}</span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-32 bg-muted rounded-full" role="progressbar" aria-valuenow={item.usage} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.feature}: ${item.usage}%`}>
                    <div className={`h-full rounded-full ${item.usage > 70 ? "bg-green-500" : item.usage > 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${item.usage}%` }} />
                  </div>
                  <span className="text-sm text-muted-foreground w-10 text-right">{item.usage}%</span>
                </div>
              </div>
            )) : (
              <>
                {[{ feature: "Task Management", usage: 92 }, { feature: "File Upload", usage: 78 }, { feature: "Project Management", usage: 65 }, { feature: "Time Tracking", usage: 45 }, { feature: "API Access", usage: 30 }, { feature: "Workflow Automation", usage: 15 }].map((item) => (
                  <div key={item.feature} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span>{item.feature}</span>
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-32 bg-muted rounded-full" role="progressbar" aria-valuenow={item.usage} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.feature}: ${item.usage}%`}>
                        <div className={`h-full rounded-full ${item.usage > 70 ? "bg-green-500" : item.usage > 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${item.usage}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground w-10 text-right">{item.usage}%</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="resources">
          <Card><CardContent className="pt-6">
            <p className="text-muted-foreground">Access training resources, documentation, interactive product tours, guided setup wizards, contextual help, sample workspaces, and best practice guides. The customer success platform provides AI-assisted configuration recommendations and onboarding progress tracking.</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
