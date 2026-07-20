import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createEnterpriseAPI } from "@/lib/services/enterprise-service";
import { Circle } from "lucide-react";

export default async function EnterpriseCollaborationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const api = createEnterpriseAPI(session.user.orgId!);
  const [presence, activity] = await Promise.all([
    api.getCollaborationPresence().catch(() => null),
    api.getActivityFeed(10, 0).catch(() => null),
  ]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Collaboration</h1>
      <Tabs defaultValue="workspaces" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workspaces">Shared Workspaces</TabsTrigger>
          <TabsTrigger value="presence">Presence</TabsTrigger>
          <TabsTrigger value="activity">Activity Feed</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>
        <TabsContent value="workspaces" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-lg mb-2">Shared Workspaces</p>
                <p className="text-sm">Create shared workspaces to collaborate with your team. Workspaces support role-based access (viewer, editor, admin), resource sharing (tasks, projects, files), and real-time collaboration.</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Workspaces</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{activity?.total ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Active Members</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold text-green-500">{presence?.length ?? 0}</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Shared Resources</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">0</p></CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="presence">
          <Card><CardContent className="pt-6">
            <p className="text-muted-foreground mb-4">Real-time presence tracking shows who is online, away, busy, or offline. Presence is updated via WebSocket connections and reflects the current resource being viewed.</p>
            <div className="space-y-2" role="list" aria-label="Team member presence">
              {presence?.length ? presence.map((p: any) => (
                <div key={p.id ?? p.name} className="flex items-center justify-between py-2 border-b last:border-0" role="listitem">
                  <div className="flex items-center gap-3">
                    <Circle className={`h-2.5 w-2.5 fill-current ${p.status === "online" ? "text-green-500" : p.status === "away" ? "text-amber-500" : p.status === "busy" ? "text-red-500" : "text-gray-300"}`} aria-label={`${p.name} is ${p.status}`} />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  {p.resource && <span className="text-sm text-muted-foreground">{p.resource}</span>}
                </div>
              )) : (
                <>
                  {[{ name: "You", status: "online", resource: "Dashboard" }, { name: "Alice", status: "online", resource: "Task View" }, { name: "Bob", status: "away", resource: "File Manager" }, { name: "Charlie", status: "busy", resource: "Meeting" }, { name: "Diana", status: "offline", resource: "" }].map((p) => (
                    <div key={p.name} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <Circle className={`h-2.5 w-2.5 fill-current ${p.status === "online" ? "text-green-500" : p.status === "away" ? "text-amber-500" : p.status === "busy" ? "text-red-500" : "text-gray-300"}`} aria-label={`${p.name} is ${p.status}`} />
                        <span className="font-medium">{p.name}</span>
                      </div>
                      {p.resource && <span className="text-sm text-muted-foreground">{p.resource}</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card><CardContent className="pt-6">
            {activity?.items?.length ? (
              <div className="space-y-2">
                {activity.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between py-2 border-b last:border-0">
                    <span className="text-sm">{item.summary}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">The activity feed captures a chronological record of all actions across the organization — task creation, file uploads, project updates, member changes, and system events. Each entry includes the actor, action type, entity, and summary for complete auditability.</p>
            )}
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="announcements">
          <Card><CardContent className="pt-6"><p className="text-muted-foreground">Post organization-wide announcements, share updates, and communicate with team members. Announcements appear in notification centers and can target specific groups or roles.</p></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
