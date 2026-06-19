"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClockIcon, Loader2Icon } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  assigneeId?: string;
  dueDate?: string;
};

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const [pending, setPending] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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
            .then((res) => setPending((res.data || res || []).filter((t: Task) => t.status === "review")))
            .catch(() => {})
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [session]);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-6" />
            <h1 className="text-2xl font-bold">Pending Approvals</h1>
            <Badge variant="secondary" className="ml-auto">{pending.length} pending</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle>Tasks awaiting review</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
              ) : pending.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tasks pending approval.</p>
              ) : (
                <div className="space-y-2">
                  {pending.map((t) => (
                    <div key={t._id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.dueDate ? `Due: ${new Date(t.dueDate).toLocaleDateString()}` : "No due date"}
                        </p>
                      </div>
                      <Badge variant="secondary">{t.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
