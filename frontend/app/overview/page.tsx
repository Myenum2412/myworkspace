import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import OverviewInteractive from "./overview-interactive";

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
  isBookmarked?: boolean;
};

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  const currentUserId = session.user.id;

  let tasks: Task[] = [];
  if (orgId) {
    const raw = await db.collection(collections.tasks).aggregate([
      { $match: { orgId } },
      {
        $lookup: {
          from: "users",
          localField: "assigneeId",
          foreignField: "id",
          as: "assignee",
          pipeline: [{ $project: { _id: 0, name: 1, image: 1 } }],
        },
      },
      { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "id",
          as: "creator",
          pipeline: [{ $project: { _id: 0, name: 1, image: 1 } }],
        },
      },
      { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
    ]).toArray();
    
    const rawTasks = raw as unknown as Record<string, unknown>[];
    const allUserIds = new Set<string>();
    rawTasks.forEach((t) => {
      const aId = (t.assigneeId as string) || "";
      const cId = (t.creatorId as string) || "";
      if (aId) allUserIds.add(aId);
      if (cId) allUserIds.add(cId);
    });
    const userIdsArr = [...allUserIds];
    let userMap = new Map<string, { name: string; image: string }>();
    if (userIdsArr.length > 0) {
      const userDocs = await db.collection(collections.users).find({ id: { $in: userIdsArr } }).project({ _id: 0, id: 1, name: 1, image: 1 }).toArray() as unknown as Record<string, unknown>[];
      userMap = new Map(userDocs.map((u) => [u.id as string, { name: (u.name as string) || "", image: (u.image as string) || "" }]));
    }

    tasks = rawTasks.map((t) => {
      const assignee = (t.assignee as Record<string, unknown> | null) || null;
      const creator = (t.creator as Record<string, unknown> | null) || null;
      const assigneeId = (t.assigneeId as string) || "";
      const creatorId = (t.creatorId as string) || "";
      return {
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      description: (t.description as string) || "",
      status: (t.status as string) || "",
      priority: (t.priority as string) || "",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
      assigneeId,
      assigneeName: (assignee?.name as string) || userMap.get(assigneeId)?.name || assigneeId.slice(0, 8),
      assigneeAvatar: (assignee?.image as string) || userMap.get(assigneeId)?.image || "",
      creatorId,
      creatorName: (creator?.name as string) || userMap.get(creatorId)?.name || creatorId.slice(0, 8),
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      isBookmarked: (t.isBookmarked as boolean) || false,
      };
    });
  }

  return <OverviewInteractive tasks={tasks} currentUserId={currentUserId} />;
}
