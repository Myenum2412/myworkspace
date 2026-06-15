import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { DashboardMetrics } from "./metrics";
import { RecentActivityFeed } from "./activity-feed";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              Welcome back, {session.user.name}
            </h1>
          </div>
          <DashboardMetrics orgId="demo-org-id" />
          <div className="grid gap-4 md:grid-cols-2">
            <RecentActivityFeed orgId="demo-org-id" />
            <div className="rounded-xl bg-muted/50 p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <a
                  href="/overview"
                  className="block rounded-lg border p-4 hover:bg-muted/80 transition-colors"
                >
                  <h3 className="font-medium">View All Tasks</h3>
                  <p className="text-sm text-muted-foreground">
                    Browse and manage your team tasks
                  </p>
                </a>
                <a
                  href="/orgmenu/analytics"
                  className="block rounded-lg border p-4 hover:bg-muted/80 transition-colors"
                >
                  <h3 className="font-medium">Analytics</h3>
                  <p className="text-sm text-muted-foreground">
                    View team performance metrics
                  </p>
                </a>
                <a
                  href="/orgmenu/settings"
                  className="block rounded-lg border p-4 hover:bg-muted/80 transition-colors"
                >
                  <h3 className="font-medium">Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure your workspace
                  </p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
