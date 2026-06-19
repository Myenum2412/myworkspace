"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircleIcon } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  status: string;
};

export default function RejectedPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (orgId) {
          fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => setTasks((res.data || res || []).filter((t: Task) => t.status === "cancelled")))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [session]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <XCircleIcon className="size-6 text-red-600" />
            <h1 className="text-2xl font-bold">Rejected</h1>
          </div>
          <Card>
            <CardHeader><CardTitle>Cancelled Tasks</CardTitle></CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No rejected/cancelled tasks.</p>
              ) : (
                <div className="space-y-2">{tasks.map((t) => (
                  <div key={t._id} className="flex items-center justify-between rounded-lg border p-3">
                    <p className="font-medium text-sm">{t.title}</p>
                    <Badge className="bg-red-100 text-red-700">Cancelled</Badge>
                  </div>
                ))}</div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
