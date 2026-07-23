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
  type: string;
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
    // Find teams the user is a member of
    const userTeamMembers = await db
      .collection("teammembers")
      .find({ orgId, userId: session.user.id })
      .toArray() as unknown as { teamId: string }[];
    const userTeamIds = userTeamMembers.map((m) => m.teamId);

    const now = new Date();

    // Get overdue tasks (assigned to user OR team tasks OR common tasks with user)
    const overdueMatch: Record<string, unknown> = {
      orgId,
      dueDate: { $lt: now },
      status: { $nin: ["done", "cancelled", "completed", "closed", "rejected"] },
      $or: [
        { assigneeId: session.user.id },
        { type: "team", teamId: { $in: userTeamIds } },
        { type: "common", selectedUserIds: session.user.id },
      ],
    };

    const overdueRaw = (await db
      .collection(collections.tasks)
      .find(overdueMatch)
      .project({ title: 1, dueDate: 1 })
      .sort({ dueDate: 1 })
      .limit(10)
      .toArray()) as unknown as Record<string, unknown>[];

    overdueTasks = overdueRaw.map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
    }));

    // Show tasks assigned to user OR team tasks OR common tasks with user
    const match: Record<string, unknown> = {
      orgId,
      $or: [
        { assigneeId: session.user.id },
        { type: "team", teamId: { $in: userTeamIds } },
        { type: "common", selectedUserIds: session.user.id },
      ],
    };

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
        type: (t.type as string) || "individual",
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
        <TasksInteractive initialTasks={tasks} orgId={orgId || ""} sessionUserId={session?.user?.id} />
      </Suspense>
    </>
  );
}
