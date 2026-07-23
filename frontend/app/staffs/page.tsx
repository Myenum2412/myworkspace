import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import {
  ListTodoIcon,
  BriefcaseIcon,
  AlertCircleIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaffTasksView } from "./tasks/staff-tasks-view";
import Stats07 from "@/components/stats-07";

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
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
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

    // Fetch tasks assigned to the current user only
    const rawTasks = (await db
      .collection(collections.tasks)
      .aggregate([
        { $match: { orgId, assigneeId: session.user.id } },
        { $sort: { createdAt: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: "users",
            localField: "assigneeId",
            foreignField: "id",
            as: "assignee",
          },
        },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "creatorId",
            foreignField: "id",
            as: "creator",
          },
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
      ])
      .toArray()) as unknown as Record<string, unknown>[];

    tasks = rawTasks.map((t) => {
      const assignee = t.assignee as Record<string, unknown> | null;
      const creator = t.creator as Record<string, unknown> | null;
      return {
        _id: String(t._id ?? ""),
        title: (t.title as string) || "",
        priority: (t.priority as string) || "medium",
        status: (t.status as string) || "todo",
        assigneeId: (t.assigneeId as string) || "",
        assigneeName: assignee?.name as string || "",
        assigneeAvatar: assignee?.image as string || "",
        creatorId: (t.creatorId as string) || "",
        creatorName: creator?.name as string || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
      };
    });
  }

  const COMPLETED_STATUSES = ["done", "completed", "cancelled", "closed", "rejected"];

  const now = new Date();
  let overdueTasks: Task[] = [];
  if (orgId) {
    const rawOverdue = (await db
      .collection(collections.tasks)
      .aggregate([
        {
          $match: {
            orgId,
            assigneeId: session.user.id,
            dueDate: { $lt: now },
            status: { $nin: COMPLETED_STATUSES },
          },
        },
        { $sort: { dueDate: 1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: "users",
            localField: "assigneeId",
            foreignField: "id",
            as: "assignee",
          },
        },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "creatorId",
            foreignField: "id",
            as: "creator",
          },
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
      ])
      .toArray()) as unknown as Record<string, unknown>[];

    overdueTasks = rawOverdue.map((t) => {
      const assignee = t.assignee as Record<string, unknown> | null;
      const creator = t.creator as Record<string, unknown> | null;
      return {
        _id: String(t._id ?? ""),
        title: (t.title as string) || "",
        priority: (t.priority as string) || "medium",
        status: (t.status as string) || "todo",
        assigneeId: (t.assigneeId as string) || "",
        assigneeName: assignee?.name as string || "",
        assigneeAvatar: assignee?.image as string || "",
        creatorId: (t.creatorId as string) || "",
        creatorName: creator?.name as string || "",
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
    .slice(0, 10);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="size-6" />
          <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        </div>
      </div>

      {/* Stats Overview */}
      <Stats07
        items={[
          { name: 'Total Staff', value: totalStaff, subtitle: 'All members' },
          { name: 'Active', value: activeStaff, subtitle: 'Currently active' },
          { name: 'On Leave', value: onLeave, subtitle: 'Away from work' },
          { name: 'Total Tasks', value: totalTasks, subtitle: 'Recent tasks' },
          { name: 'Completed', value: completedTasks, subtitle: 'Done tasks' },
          { name: 'Pending', value: pendingTasks, subtitle: 'In progress' },
        ]}
      />

      <div className={`grid gap-4 ${overdueTasks.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <ListTodoIcon className="size-4" />
              Recently Allocated Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StaffTasksView tasks={recentTasks} sessionUserId={session.user.id} />
          </CardContent>
        </Card>

        {overdueTasks.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                <AlertCircleIcon className="size-4" />
                Overdue Tasks ({overdueTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StaffTasksView tasks={overdueTasks} sessionUserId={session.user.id} />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
