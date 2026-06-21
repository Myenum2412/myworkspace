import { StaffSidebar } from "@/components/staff-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export const metadata = {
  title: "Staffs",
};

const staff = [
  { name: "Alice Chen", email: "alice.chen@company.com", role: "Lead Engineer", department: "Engineering", status: "active", avatar: "" },
  { name: "Bob Martinez", email: "bob.martinez@company.com", role: "Senior Designer", department: "Design", status: "active", avatar: "" },
  { name: "Carol Williams", email: "carol.w@company.com", role: "Marketing Manager", department: "Marketing", status: "active", avatar: "" },
  { name: "David Kim", email: "david.kim@company.com", role: "Account Executive", department: "Sales", status: "active", avatar: "" },
  { name: "Eve Johnson", email: "eve.j@company.com", role: "HR Coordinator", department: "HR", status: "active", avatar: "" },
  { name: "Frank Lee", email: "frank.lee@company.com", role: "Financial Analyst", department: "Finance", status: "active", avatar: "" },
  { name: "Grace Patel", email: "grace.p@company.com", role: "Operations Lead", department: "Operations", status: "active", avatar: "" },
  { name: "Henry Garcia", email: "henry.g@company.com", role: "Customer Success", department: "Customer Success", status: "on_leave", avatar: "" },
  { name: "Iris Tanaka", email: "iris.t@company.com", role: "Junior Developer", department: "Engineering", status: "active", avatar: "" },
  { name: "Jack Wilson", email: "jack.w@company.com", role: "Content Writer", department: "Marketing", status: "active", avatar: "" },
  { name: "Karen Brown", email: "karen.b@company.com", role: "QA Engineer", department: "Engineering", status: "active", avatar: "" },
  { name: "Leo Anderson", email: "leo.a@company.com", role: "Sales Representative", department: "Sales", status: "on_leave", avatar: "" },
];

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  on_leave: "bg-amber-100 text-amber-700 border-amber-200",
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
};

const statusColors: Record<string, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-amber-100 text-amber-700 border-amber-200",
  review: "bg-purple-100 text-purple-700 border-purple-200",
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

export default async function StaffsPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  let tasks: Array<{
    title: string;
    priority: string;
    status: string;
    assigneeName: string;
    dueDate: string | null;
  }> = [];

  try {
    if (session?.user?.id) {
      const orgId = await getUserOrgId(session.user.id);
      if (orgId) {
        const raw = await db.collection(collections.tasks)
          .find({ orgId })
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray();

        const userIds = new Set<string>();
        raw.forEach((t: Record<string, unknown>) => {
          if (t.assigneeId) userIds.add(t.assigneeId as string);
          if (t.creatorId) userIds.add(t.creatorId as string);
        });

        const users = await db.collection(collections.users)
          .find({ id: { $in: [...userIds] } })
          .project({ id: 1, name: 1 })
          .toArray();

        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u.name]));

        tasks = raw.map((t: Record<string, unknown>) => ({
          title: t.title as string,
          priority: t.priority as string || "medium",
          status: t.status as string || "todo",
          assigneeName: (t.assigneeId ? userMap.get(t.assigneeId as string) : null) as string || "Unassigned",
          dueDate: t.dueDate ? new Date(t.dueDate as string).toLocaleDateString() : null,
        }));
      }
    }
  } catch {
    // tasks stay empty on error
  }

  return (
    <SidebarProvider>
      <StaffSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div>
            <h1 className="text-2xl font-bold">Staffs</h1>
            <p className="text-sm text-muted-foreground mt-1">{staff.length} staff members</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Staff Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Name</th>
                      <th className="pb-3 font-medium">Department</th>
                      <th className="pb-3 font-medium">Role</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => (
                      <tr key={s.email} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarImage src={s.avatar} alt={s.name} />
                              <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-sm">{s.department}</td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">{s.role}</td>
                        <td className="py-3">
                          <Badge className={statusStyles[s.status] || ""}>
                            {s.status === "on_leave" ? "On Leave" : "Active"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {tasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="pb-3 font-medium">Task</th>
                        <th className="pb-3 font-medium">Assignee</th>
                        <th className="pb-3 font-medium">Priority</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium">Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 text-sm font-medium">{t.title}</td>
                          <td className="py-3 pr-4 text-sm text-muted-foreground">{t.assigneeName}</td>
                          <td className="py-3 pr-4">
                            <Badge className={priorityStyles[t.priority] || ""}>
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge className={statusColors[t.status] || ""}>
                              {t.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-3 text-sm text-muted-foreground">{t.dueDate || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
