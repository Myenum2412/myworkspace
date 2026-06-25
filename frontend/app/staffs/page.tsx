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



const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  active: "bg-red-100 text-red-700 border-red-300",
  on_leave: "bg-gray-100 text-gray-700 border-gray-300",
};

const priorityStyles: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-300",
  high: "bg-orange-100 text-orange-700 border-orange-300",
  medium: "bg-gray-100 text-gray-700 border-gray-300",
  low: "bg-gray-200 text-gray-700 border-gray-300",
};

const statusColors: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700 border-gray-300",
  in_progress: "bg-red-100 text-red-700 border-red-300",
  review: "bg-gray-100 text-gray-700 border-gray-300",
  done: "bg-red-100 text-red-700 border-red-300",
  cancelled: "bg-red-100 text-red-700 border-red-300",
};

export default async function StaffsPage() {
  const session = await auth();

  let staff: Array<{ name: string; email: string; role: string; department: string; status: string; avatar: string }> = [];

  try {
    const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;
    if (orgId) {
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      if (userIds.length > 0) {
        const users = await db.collection(collections.users)
          .find({ id: { $in: userIds } })
          .project({ id: 1, name: 1, email: 1, image: 1, status: 1 })
          .toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
        staff = members.map((m: Record<string, unknown>) => {
          const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
          return {
            name: (user?.name as string) || "Unknown",
            email: (user?.email as string) || "",
            role: (m.role as string) || "member",
            department: (user?.department as string) || "",
            status: (user?.status as string) || "active",
            avatar: (user?.image as string) || "",
          };
        });
      }
    }
  } catch {
    // staff stays empty on error
  }

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
              <thead className="bg-blue-50">
                <tr className="border-b bg-blue-50 text-left text-sm text-blue-800 font-medium">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.email} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors bg-white">
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
                <thead className="bg-blue-50">
                  <tr className="border-b bg-blue-50 text-left text-sm text-blue-800 font-medium">
                    <th className="pb-3 font-medium">Task</th>
                    <th className="pb-3 font-medium">Assignee</th>
                    <th className="pb-3 font-medium">Priority</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors bg-white">
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
  );
}
