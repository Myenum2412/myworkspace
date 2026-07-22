import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import {
  UsersIcon,
  ListTodoIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  BriefcaseIcon,
  UserCheckIcon,
  UserXIcon,
  CalendarIcon,
  HourglassIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StaffTasksView } from "@/components/staffs/staff-tasks-view";

export const dynamic = "force-dynamic";

type StaffMember = {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  image: string;
};

type Task = {
  _id: string;
  title: string;
  priority: string;
  status: string;
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
  dueDate: string | null;
};

export default async function StaffsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let staff: StaffMember[] = [];
  let tasks: Task[] = [];

  if (orgId) {
    const orgMembers = (await db
      .collection(collections.orgMembers)
      .find({ orgId })
      .toArray()) as unknown as { userId: string; role: string }[];
    const userIds = orgMembers.map((m) => m.userId);

    const users = (await db
      .collection(collections.users)
      .find({ id: { $in: userIds } }, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray()) as unknown as Record<string, unknown>[];

    staff = users.map((u) => {
      const member = orgMembers.find((m) => m.userId === (u.id as string));
      return {
        _id: String(u._id ?? ""),
        name: (u.name as string) || "",
        email: (u.email as string) || "",
        role: ((member?.role as string) || "staffs"),
        department: (u.department as string) || "",
        status: (u.status as string) || "offline",
        image: (u.image as string) || "",
      };
    });

    // Fetch last 10 tasks for this org with assignee lookup
    const rawTasks = (await db
      .collection(collections.tasks)
      .aggregate([
        { $match: { orgId } },
        { $sort: { createdAt: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "assigneeId",
            foreignField: "id",
            as: "assignee",
          },
        },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
      ])
      .toArray()) as unknown as Record<string, unknown>[];

    tasks = rawTasks.map((t) => {
      const assignee = t.assignee as Record<string, unknown> | null;
      return {
        _id: String(t._id ?? ""),
        title: (t.title as string) || "",
        priority: (t.priority as string) || "medium",
        status: (t.status as string) || "todo",
        assigneeId: (t.assigneeId as string) || "",
        assigneeName: assignee?.name as string || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
      };
    });
  }

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.status === "active").length;
  const onLeave = staff.filter((s) => s.status === "on_leave").length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;

  const today = new Date().toDateString();
  const todayTasks = tasks.filter((t) => {
    const d = t.createdAt ? new Date(t.createdAt).toDateString() : "";
    return d === today;
  }).length;
  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const absentCount = onLeave + (totalStaff - activeStaff - onLeave);
  const staffByStatus = [
    { label: "Present", count: activeStaff, icon: UserCheckIcon, color: "bg-green-500" },
    { label: "Absent", count: absentCount, icon: UserXIcon, color: "bg-gray-500" },
  ];

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="size-6" />
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" /> Today Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks created today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <HourglassIcon className="size-3.5" /> Pending Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks not yet completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3.5" /> Completed Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">Tasks done</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ListTodoIcon className="size-3.5" /> Total Task
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground mt-1">All tasks</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UsersIcon className="size-4" />
              Staff Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staffByStatus.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className={`size-3 rounded-full ${s.color}`} />
                  <span className="text-sm w-20">{s.label}</span>
                  <div className="flex-1 h-2 bg-muted rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${s.color} rounded-sm`}
                      style={{ width: `${totalStaff > 0 ? (s.count / totalStaff) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ListTodoIcon className="size-4" />
            Recently Allocated Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StaffTasksView tasks={recentTasks} />
        </CardContent>
      </Card>
    </main>
  );
}
