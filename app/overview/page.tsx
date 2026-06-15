import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "./task-list";

export const metadata = {
  title: "Task Overview",
  description: "View and manage all team tasks",
};

const getTasks = cache(async (orgId: string) => {
  return db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.orgId, orgId))
    .orderBy(desc(schema.tasks.createdAt))
    .all();
});

const priorityColors: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

const statusColors: Record<string, string> = {
  todo: "bg-gray-500",
  in_progress: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-emerald-500",
  cancelled: "bg-red-500",
};

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tasks = await getTasks("demo-org-id");

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Task Overview</h1>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {tasks.length} tasks
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">To Do</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "todo").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">In Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "in_progress").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "review").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter((t) => t.status === "done").length}
                </div>
              </CardContent>
            </Card>
          </div>

          <TaskList tasks={tasks} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
