import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import TeamTasksInteractive, { TeamTask } from "./teamtasks-interactive";

export const dynamic = "force-dynamic";

// Mirrors the backend GET /api/tasks handler: filters by orgId (admin/owner
// scope — all org tasks) and joins assignee + creator user docs so the client
// can render names/avatars without a second fetch. The backend's teamTasks
// scope is identical to the default GET /?scope absent, limited here to the
// org-wide view used by the team-tasks page.
export default async function TeamTasksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let tasks: TeamTask[] = [];

  if (orgId) {
    const match: Record<string, unknown> = { orgId, teamId: { $exists: true, $ne: null } };

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
      {
        $lookup: {
          from: "teammembers",
          let: { taskTeamId: "$teamId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$teamId", "$$taskTeamId"] }, role: "team_lead" } },
            { $limit: 1 },
          ],
          as: "teamLead",
        },
      },
      { $unwind: { path: "$teamLead", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "teamLead.userId",
          foreignField: "id",
          as: "teamHeadUser",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: { path: "$teamHeadUser", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "teams",
          let: { taskTeamId: "$teamId" },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$taskTeamId"] } } },
            { $project: { name: 1 } },
            { $limit: 1 },
          ],
          as: "teamInfo",
        },
      },
      { $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
    ];

    const raw = (await db
      .collection(collections.tasks)
      .aggregate(pipeline)
      .toArray()) as unknown as Record<string, unknown>[];

    tasks = raw.map((t) => {
      const assignee = t.assignee as Record<string, unknown> | null;
      const creator = t.creator as Record<string, unknown> | null;
      const teamHeadUser = t.teamHeadUser as Record<string, unknown> | null;
      const teamInfo = t.teamInfo as Record<string, unknown> | null;
      return {
        id: (t._id as { toString: () => string }).toString(),
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        status: (t.status as string) || "todo",
        priority: (t.priority as string) || "medium",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId: t.assigneeId
          ? (t.assigneeId as { toString?: () => string }).toString?.() || (t.assigneeId as string)
          : "",
        assigneeName: assignee ? (assignee.name as string) || "" : "",
        assigneeAvatar: assignee ? (assignee.image as string) || "" : "",
        creatorId: t.creatorId
          ? (t.creatorId as { toString?: () => string }).toString?.() || (t.creatorId as string)
          : "",
        creatorName: creator ? (creator.name as string) || "" : "",
        teamHeadName: teamHeadUser ? (teamHeadUser.name as string) || "" : "",
        teamName: teamInfo ? (teamInfo.name as string) || "" : "",
        teamId: (t.teamId as string) || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      };
    });
  }

  return (
    <Suspense fallback={null}>
      <TeamTasksInteractive tasks={tasks} />
    </Suspense>
  );
}
