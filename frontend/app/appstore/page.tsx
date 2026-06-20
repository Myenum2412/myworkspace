import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { StoreIcon, Cloud, Database, MessageSquare, FileText, Shield, BarChart3, Mail, Puzzle, Workflow } from "lucide-react";

export const metadata = {
  title: "App Store",
  description: "Browse and install workspace applications",
};

const apps = [
  { name: "Cloud Sync", description: "Seamless sync with Google Drive, Dropbox, and OneDrive", icon: Cloud, color: "bg-blue-500", installed: true, category: "Storage" },
  { name: "Database Hub", description: "Connect and query your databases directly from workspace", icon: Database, color: "bg-purple-500", installed: true, category: "Data" },
  { name: "Team Chat", description: "Real-time messaging integrated with your projects", icon: MessageSquare, color: "bg-emerald-500", installed: true, category: "Communication" },
  { name: "Report Builder", description: "Create and share custom reports with drag-and-drop", icon: FileText, color: "bg-orange-500", installed: false, category: "Analytics" },
  { name: "Access Control", description: "Advanced permission management and audit logging", icon: Shield, color: "bg-red-500", installed: true, category: "Security" },
  { name: "Analytics Pro", description: "Deep insights into team productivity and project metrics", icon: BarChart3, color: "bg-cyan-500", installed: false, category: "Analytics" },
  { name: "Mail Bridge", description: "Send and receive emails directly from workspace", icon: Mail, color: "bg-yellow-500", installed: false, category: "Communication" },
  { name: "Form Builder", description: "Create custom forms and collect responses", icon: Puzzle, color: "bg-pink-500", installed: false, category: "Productivity" },
  { name: "Automation", description: "Build automated workflows with visual triggers", icon: Workflow, color: "bg-indigo-500", installed: false, category: "Automation" },
];

export default async function AppStorePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const user = {
    name: session.user.name || "User",
    email: session.user.email || "user@example.com",
    avatar: session.user.image || "",
  };

  const installedCount = apps.filter((a) => a.installed).length;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <StoreIcon className="size-6" />
                App Store
              </h1>
              <p className="text-muted-foreground mt-1">
                Extend your workspace with powerful integrations
              </p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {installedCount} / {apps.length} installed
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => {
              const Icon = app.icon;
              return (
                <Card key={app.name} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`p-2.5 rounded-lg ${app.color} text-white`}>
                        <Icon className="size-5" />
                      </div>
                      <Badge variant={app.installed ? "secondary" : "outline"}>
                        {app.installed ? "Installed" : "Install"}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 text-base">{app.name}</CardTitle>
                    <CardDescription>{app.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Badge variant="outline" className="text-xs">{app.category}</Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
