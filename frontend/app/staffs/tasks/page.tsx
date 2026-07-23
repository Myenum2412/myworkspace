import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TasksInteractive from "./tasks-interactive";
import { OverdueTasksCard, type OverdueTask } from "@/components/overdue-tasks-card";

export const dynamic = "force-dynamic";

type Task = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
};

export default async function StaffTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let tasks: Task[] = [];
  let overdueTasks: OverdueTask[] = [];

  if (orgId) {
    const now = new Date();
    const overdueRaw = (await db
      .collection(collections.tasks)
      .find({
        orgId,
        dueDate: { $lt: now },
        status: { $nin: ["done", "cancelled", "completed", "closed", "rejected"] },
      })
      .project({ title: 1, dueDate: 1 })
      .sort({ dueDate: 1 })
      .limit(10)
      .toArray()) as unknown as Record<string, unknown>[];

    overdueTasks = overdueRaw.map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
    }));
    // Show all tasks for the org
    const match: Record<string, unknown> = { orgId };

    const pipeline: Record<string, unknown>[] = [
      { $match: match },
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
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
    ];

    const raw = (await db
      .collection(collections.tasks)
      .aggregate(pipeline)
      .toArray()) as unknown as Record<string, unknown>[];

    const rawTasks = raw as unknown as Record<string, unknown>[];
    const allUserIds = new Set<string>();
    rawTasks.forEach((t) => {
      const aId = t.assigneeId ? ((t.assigneeId as { toString?: () => string }).toString?.() || (t.assigneeId as string)) : "";
      const cId = t.creatorId ? ((t.creatorId as { toString?: () => string }).toString?.() || (t.creatorId as string)) : "";
      if (aId) allUserIds.add(aId);
      if (cId) allUserIds.add(cId);
    });
    let userMap = new Map<string, { name: string; image: string }>();
    if (allUserIds.size > 0) {
      const userDocs = await db.collection(collections.users).find({ id: { $in: [...allUserIds] } }).project({ _id: 0, id: 1, name: 1, image: 1 }).toArray() as unknown as Record<string, unknown>[];
      userMap = new Map(userDocs.map((u) => [u.id as string, { name: (u.name as string) || "", image: (u.image as string) || "" }]));
    }

    tasks = rawTasks.map((t) => {
      const assignee = t.assignee as Record<string, unknown> | null;
      const creator = t.creator as Record<string, unknown> | null;
      const assigneeId = t.assigneeId ? ((t.assigneeId as { toString?: () => string }).toString?.() || (t.assigneeId as string)) : "";
      const creatorId = t.creatorId ? ((t.creatorId as { toString?: () => string }).toString?.() || (t.creatorId as string)) : "";
      const assigneeUser = assignee || (assigneeId ? userMap.get(assigneeId) : undefined);
      const creatorUser = creator || (creatorId ? userMap.get(creatorId) : undefined);
      return {
        id: (t._id as { toString: () => string }).toString(),
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        status: (t.status as string) || "todo",
        priority: (t.priority as string) || "medium",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId,
        assigneeName: assigneeUser?.name as string || "",
        assigneeAvatar: assigneeUser?.image as string || "",
        creatorId,
        creatorName: creatorUser?.name as string || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      };
    });
  }

  return (
    <>
      <OverdueTasksCard tasks={overdueTasks} />
      <Suspense fallback={null}>
        <TasksInteractive tasks={tasks} sessionUserId={session?.user?.id} />
      </Suspense>
    </>
  );
}
