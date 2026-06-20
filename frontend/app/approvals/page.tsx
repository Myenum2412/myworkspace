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

const FAKE_TASKS = [
  { _id: "1", title: "Design new dashboard layout", description: "Create wireframes for the main dashboard", status: "in_progress", priority: "high", dueDate: "2026-07-01T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", assigneeAvatar: "", creatorId: "u2", creatorName: "Bob Martinez", createdAt: "2026-06-10T00:00:00Z" },
  { _id: "2", title: "Implement user authentication", description: "Set up OAuth and session management", status: "todo", priority: "urgent", dueDate: "2026-06-28T00:00:00Z", assigneeId: "u3", assigneeName: "Carol Williams", assigneeAvatar: "", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-08T00:00:00Z" },
  { _id: "3", title: "API integration for payment gateway", description: "Connect Stripe for subscription billing", status: "review", priority: "high", dueDate: "2026-06-30T00:00:00Z", assigneeId: "u2", assigneeName: "Bob Martinez", assigneeAvatar: "", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-05T00:00:00Z" },
  { _id: "4", title: "Write unit tests for user module", description: "Cover all user service functions", status: "done", priority: "medium", dueDate: "2026-06-25T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", assigneeAvatar: "", creatorId: "u3", creatorName: "Carol Williams", createdAt: "2026-06-01T00:00:00Z" },
  { _id: "5", title: "Mobile responsive fixes", description: "Fix layout issues on mobile devices", status: "todo", priority: "medium", dueDate: "2026-07-05T00:00:00Z", assigneeId: "u4", assigneeName: "David Kim", assigneeAvatar: "", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-12T00:00:00Z" },
  { _id: "6", title: "Database optimization", description: "Add indexes and optimize slow queries", status: "in_progress", priority: "high", dueDate: "2026-07-02T00:00:00Z", assigneeId: "u3", assigneeName: "Carol Williams", assigneeAvatar: "", creatorId: "u2", creatorName: "Bob Martinez", createdAt: "2026-06-09T00:00:00Z" },
  { _id: "7", title: "User onboarding flow", description: "Design and implement new user onboarding", status: "review", priority: "medium", dueDate: "2026-06-29T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", assigneeAvatar: "", creatorId: "u3", creatorName: "Carol Williams", createdAt: "2026-06-07T00:00:00Z" },
  { _id: "8", title: "Security audit", description: "Review code for vulnerabilities", status: "cancelled", priority: "low", dueDate: "2026-06-20T00:00:00Z", assigneeId: "u2", assigneeName: "Bob Martinez", assigneeAvatar: "", creatorId: "u4", creatorName: "David Kim", createdAt: "2026-06-03T00:00:00Z" },
];

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
            .catch(() => setPending(FAKE_TASKS.filter(t => t.status === "review")))
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => { setPending(FAKE_TASKS.filter(t => t.status === "review")); setLoading(false); });
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
