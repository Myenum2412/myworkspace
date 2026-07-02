import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TasksInteractive from "./tasks-interactive";

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

  if (orgId) {
    const userId = session.user.id;

    // Staff scope: only show tasks assigned to the user or their teams
    // (mirrors backend /api/tasks?scope=staff logic)
    const userTeams = (await db
      .collection(collections.teamMembers)
      .find({ userId })
      .toArray()) as unknown as { teamId: string }[];
    const teamIds = userTeams.map((t) => t.teamId);

    const orConditions: Record<string, unknown>[] = [{ assigneeId: userId }];
    if (teamIds.length > 0) {
      orConditions.push({ teamId: { $in: teamIds } });
    }

    const match: Record<string, unknown> = { orgId, $or: orConditions };

    const pipeline: Record<string, unknown>[] = [
      { $match: match },
      {
        $lookup: {
          from: "users",
          localField: "assigneeId",
          foreignField: "id",
          as: "assignee",
          pipeline: [{ $project: { _id: 1, name: 1, email: 1, image: 1 } }],
        },
      },
      { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "id",
          as: "creator",
          pipeline: [{ $project: { _id: 1, name: 1, email: 1, image: 1 } }],
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
      return {
        id: (t._id as { toString: () => string }).toString(),
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        status: (t.status as string) || "todo",
        priority: (t.priority as string) || "medium",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId,
        assigneeName: assignee ? (assignee.name as string) || "" : userMap.get(assigneeId)?.name || assigneeId.slice(0, 8),
        assigneeAvatar: assignee ? (assignee.image as string) || "" : userMap.get(assigneeId)?.image || "",
        creatorId,
        creatorName: creator ? (creator.name as string) || "" : userMap.get(creatorId)?.name || creatorId.slice(0, 8),
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      };
    });
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="text-sm text-muted-foreground">Loading tasks...</div></div>}>
      <TasksInteractive tasks={tasks} />
    </Suspense>
  );
}
