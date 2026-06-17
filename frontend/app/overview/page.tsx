import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { cache } from "react";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/config";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Task Overview",
  description: "View and manage all team tasks",
};

const getTasks = cache(async (orgId: string) => {
  return db
    .collection(collections.tasks)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .toArray();
});

export default async function OverviewPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };
  const tasks = await getTasks("demo-org-id");

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Task Overview</h1>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {tasks.length} tasks
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-6 mb-6">
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Today Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "todo").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Team Task</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "in_progress").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "in_progress").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "review").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "done").length}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">In Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "cancelled").length}
                </div>
              </CardContent>
            </Card>
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
