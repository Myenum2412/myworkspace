import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StoreIcon, PuzzleIcon, BotIcon, CloudIcon, ShieldCheckIcon, BarChart3Icon } from "lucide-react";

export const metadata = {
  title: "App Store",
  description: "Browse and install workspace applications",
};

const apps = [
  { name: "Analytics Dashboard", icon: BarChart3Icon, description: "Advanced analytics and reporting tools", category: "Analytics", color: "text-blue-500" },
  { name: "AI Assistant", icon: BotIcon, description: "AI-powered task suggestions and automation", category: "AI", color: "text-purple-500" },
  { name: "Cloud Sync", icon: CloudIcon, description: "Sync your workspace across all devices", category: "Infrastructure", color: "text-cyan-500" },
  { name: "Security Scanner", icon: ShieldCheckIcon, description: "Automated security scanning and alerts", category: "Security", color: "text-emerald-500" },
  { name: "Custom Integrations", icon: PuzzleIcon, description: "Connect with your favorite tools", category: "Integrations", color: "text-amber-500" },
];

export default async function AppStorePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar />
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
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <Card key={app.name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <app.icon className={`size-8 ${app.color}`} />
                    <Badge variant="secondary">{app.category}</Badge>
                  </div>
                  <CardTitle className="mt-3">{app.name}</CardTitle>
                  <CardDescription>{app.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Install
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
