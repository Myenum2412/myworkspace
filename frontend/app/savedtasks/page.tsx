import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import SavedTasksInteractive, { SavedTask } from "./savedtasks-interactive";

function TaskListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-4 w-4 rounded" />
          <div className="flex-1 space-y-1">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function SavedTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let initialTasks: SavedTask[] = [];

  if (orgId) {
    // Replicates the backend GET /api/tasks query shape: tasks scoped to the
    // user's org, with assignee/creator names resolved via $lookup, filtered
    // to tasks with isSaved: true.
    const rawTasks = (await db
      .collection(collections.tasks)
      .aggregate([
        { $match: { orgId, isSaved: true } },
        {
          $lookup: {
            from: "users",
            localField: "assigneeId",
            foreignField: "id",
            as: "assignee",
            pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }],
          },
        },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "users",
            localField: "creatorId",
            foreignField: "id",
            as: "creator",
            pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }],
          },
        },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
      ])
      .toArray()) as unknown as Record<string, unknown>[];

    initialTasks = rawTasks.map((t) => {
      const assignee = (t.assignee as Record<string, unknown> | null) || null;
      const creator = (t.creator as Record<string, unknown> | null) || null;
      return {
        id: (t._id as { toString: () => string }).toString(),
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        status: (t.status as string) || "todo",
        priority: (t.priority as string) || "medium",
        type: (t.type as string) || "",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId: (t.assigneeId as string) || "",
        assigneeName: (assignee?.name as string) || "",
        assigneeAvatar: (assignee?.image as string) || "",
        creatorId: (t.creatorId as string) || "",
        creatorName: (creator?.name as string) || "",
        createdAt: t.createdAt
          ? new Date(t.createdAt as string).toISOString()
          : "",
      };
    });
  }

  return (
    <Suspense fallback={<TaskListSkeleton />}>
      <SavedTasksInteractive initialTasks={initialTasks} />
    </Suspense>
  );
}
