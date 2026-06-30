import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import UpcomingTasksInteractive, { UpcomingTask } from "./upcomingtasks-interactive";

export const dynamic = "force-dynamic";

export default async function UpcomingTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let initialTasks: UpcomingTask[] = [];

  if (orgId) {
    const now = new Date();
    const rawTasks = (await db
      .collection(collections.tasks)
      .find({
        orgId,
        dueDate: { $gte: now },
        status: { $nin: ["done", "cancelled"] },
      })
      .sort({ dueDate: 1 })
      .toArray()) as unknown as Record<string, unknown>[];

    // Resolve assignee/creator names in parallel
    const userIds = [...new Set(
      rawTasks.flatMap((t) => [
        t.assigneeId as string,
        t.creatorId as string,
      ]).filter(Boolean)
    )];

    const users = userIds.length > 0
      ? (await db
          .collection(collections.users)
          .find({ _id: { $in: userIds.map((id) => { try { return new (require("mongodb").ObjectId)(id); } catch { return id; } }) } }, { projection: { _id: 1, name: 1, image: 1 } })
          .toArray()) as unknown as Record<string, unknown>[]
      : [];

    // Fallback: also try by string `id` field for non-ObjectId user ids
    const usersByStringId = userIds.length > 0
      ? (await db
          .collection(collections.users)
          .find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, image: 1 } })
          .toArray()) as unknown as Record<string, unknown>[]
      : [];

    const userMap = new Map<string, { name: string; image: string }>();
    for (const u of [...users, ...usersByStringId]) {
      const uid = (u._id as { toString: () => string })?.toString() || (u.id as string) || "";
      if (uid && !userMap.has(uid)) {
        userMap.set(uid, {
          name: (u.name as string) || "",
          image: (u.image as string) || "",
        });
      }
    }

    initialTasks = rawTasks.map((t) => {
      const assigneeId = (t.assigneeId as string) || "";
      const creatorId = (t.creatorId as string) || "";
      const assignee = assigneeId ? userMap.get(assigneeId) : null;
      const creator = creatorId ? userMap.get(creatorId) : null;
      return {
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        status: (t.status as string) || "todo",
        priority: (t.priority as string) || "medium",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId,
        assigneeName: assignee?.name || (t.assigneeName as string) || "",
        assigneeAvatar: assignee?.image || (t.assigneeAvatar as string) || "",
        creatorId,
        creatorName: creator?.name || (t.creatorName as string) || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      };
    });
  }

  return (
    <Suspense fallback={null}>
      <UpcomingTasksInteractive initialTasks={initialTasks} />
    </Suspense>
  );
}
