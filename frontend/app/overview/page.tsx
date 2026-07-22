import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import OverviewClient from "./overview-client";
import type { Task } from "./columns.client";
import type { TeamTask } from "../teamtasks/teamtasks-interactive.client";
import type { AllTasksProps } from "../alltasks/alltasks-interactive.client";
import type { MyTasksProps } from "../mytasks/mytasks-interactive.client";
import type { SavedTask } from "../savedtasks/savedtasks-interactive.client";
import type { UpcomingTask } from "../upcomingtasks/upcomingtasks-interactive.client";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  const currentUserId = session.user.id;

  let overviewTasks: Task[] = [];
  let teamTasks: TeamTask[] = [];
  let allTasks: AllTasksProps["initialTasks"] = [];
  let myTasks: MyTasksProps["initialTasks"] = [];
  let savedTasks: SavedTask[] = [];
  let upcomingTasks: UpcomingTask[] = [];

  if (orgId) {
    try {
    const coll = db.collection(collections.tasks);

    const [
      overviewRaw,
      teamRaw,
      allRaw,
      myRaw,
      savedRaw,
      upcomingRaw,
    ] = await Promise.all([
      coll.aggregate([
        { $match: { orgId } },
        { $lookup: { from: "users", localField: "assigneeId", foreignField: "id", as: "assignee", pipeline: [{ $project: { _id: 0, name: 1, image: 1 } }] } },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "creatorId", foreignField: "id", as: "creator", pipeline: [{ $project: { _id: 0, name: 1, image: 1 } }] } },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        { $limit: 100 },
      ]).toArray(),

      coll.aggregate([
        { $match: { orgId, teamId: { $exists: true, $ne: null } } },
        { $lookup: { from: "users", localField: "assigneeId", foreignField: "id", as: "assignee", pipeline: [{ $project: { _id: 1, name: 1, email: 1, image: 1 } }] } },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "creatorId", foreignField: "id", as: "creator", pipeline: [{ $project: { _id: 1, name: 1, email: 1, image: 1 } }] } },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: collections.teamMembers, let: { taskTeamId: "$teamId" }, pipeline: [{ $match: { $expr: { $eq: ["$teamId", "$$taskTeamId"] }, role: "team_lead" } }, { $limit: 1 }], as: "teamLead" } },
        { $unwind: { path: "$teamLead", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "teamLead.userId", foreignField: "id", as: "teamHeadUser", pipeline: [{ $project: { name: 1 } }] } },
        { $unwind: { path: "$teamHeadUser", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "teams", let: { taskTeamId: "$teamId" }, pipeline: [{ $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$taskTeamId"] } } }, { $project: { name: 1 } }, { $limit: 1 }], as: "teamInfo" } },
        { $unwind: { path: "$teamInfo", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
      ]).toArray(),

      coll.aggregate([
        { $match: { orgId } },
        { $lookup: { from: "users", localField: "assigneeId", foreignField: "id", as: "assignee", pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }] } },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "creatorId", foreignField: "id", as: "creator", pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }] } },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "teams", localField: "teamId", foreignField: "id", as: "team", pipeline: [{ $project: { _id: 1, name: 1 } }] } },
        { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
      ]).toArray(),

      coll.aggregate([
        { $match: { orgId } },
        { $lookup: { from: "users", localField: "assigneeId", foreignField: "id", as: "assignee", pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }] } },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "creatorId", foreignField: "id", as: "creator", pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }] } },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
      ]).toArray(),

      coll.aggregate([
        { $match: { orgId, isSaved: true } },
        { $lookup: { from: "users", localField: "assigneeId", foreignField: "id", as: "assignee", pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }] } },
        { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "users", localField: "creatorId", foreignField: "id", as: "creator", pipeline: [{ $project: { _id: 1, name: 1, image: 1 } }] } },
        { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
      ]).toArray(),

      coll.find({
        orgId,
        dueDate: { $gte: new Date() },
        status: { $nin: ["done", "cancelled"] },
      }).sort({ dueDate: 1 }).limit(100).toArray(),
    ]) as unknown as Record<string, unknown>[][];

    const overviewRawArr = overviewRaw as Record<string, unknown>[];
    const allUserIds = new Set<string>();
    overviewRawArr.forEach((t) => {
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

    overviewTasks = overviewRawArr.map((t) => {
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
        isSaved: (t.isSaved as boolean) || false,
      };
    });

    teamTasks = (teamRaw as Record<string, unknown>[]).map((t) => {
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
        assigneeId: t.assigneeId ? (t.assigneeId as { toString?: () => string }).toString?.() || (t.assigneeId as string) : "",
        assigneeName: assignee ? (assignee.name as string) || "" : "",
        assigneeAvatar: assignee ? (assignee.image as string) || "" : "",
        creatorId: t.creatorId ? (t.creatorId as { toString?: () => string }).toString?.() || (t.creatorId as string) : "",
        creatorName: creator ? (creator.name as string) || "" : "",
        teamHeadName: teamHeadUser ? (teamHeadUser.name as string) || "" : "",
        teamName: teamInfo ? (teamInfo.name as string) || "" : "",
        teamId: (t.teamId as string) || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      };
    });

    const allDedupMap = new Map<string, Record<string, unknown>>();
    for (const t of (allRaw as Record<string, unknown>[])) {
      const key = String((t._id as { toString: () => string })?.toString?.() || t._id || "");
      if (!allDedupMap.has(key)) allDedupMap.set(key, t);
    }
    allTasks = [...allDedupMap.values()].map((t) => {
      const assignee = (t.assignee as Record<string, unknown> | null) || null;
      const creator = (t.creator as Record<string, unknown> | null) || null;
      const team = (t.team as Record<string, unknown> | null) || null;
      return {
        id: (t._id as { toString: () => string }).toString(),
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        type: (t.type as string) || "individual",
        status: (t.status as string) || "draft",
        priority: (t.priority as string) || "medium",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId: (t.assigneeId as string) || "",
        assigneeName: (assignee?.name as string) || "",
        assigneeAvatar: (assignee?.image as string) || "",
        creatorId: (t.creatorId as string) || "",
        creatorName: (creator?.name as string) || "",
        teamId: (t.teamId as string) || "",
        teamName: (team?.name as string) || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
        orgId: (t.orgId as string) || orgId,
      } as AllTasksProps["initialTasks"][number];
    });

    myTasks = (myRaw as Record<string, unknown>[]).map((t) => {
      const assignee = (t.assignee as Record<string, unknown> | null) || null;
      const creator = (t.creator as Record<string, unknown> | null) || null;
      return {
        id: (t._id as { toString: () => string }).toString(),
        _id: (t._id as { toString: () => string }).toString(),
        title: (t.title as string) || "",
        description: (t.description as string) || "",
        status: (t.status as string) || "todo",
        priority: (t.priority as string) || "medium",
        dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
        assigneeId: (t.assigneeId as string) || "",
        assigneeName: (assignee?.name as string) || "",
        assigneeAvatar: (assignee?.image as string) || "",
        creatorId: (t.creatorId as string) || "",
        creatorName: (creator?.name as string) || "",
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
        orgId: (t.orgId as string) || orgId,
      } as MyTasksProps["initialTasks"][number];
    });

    savedTasks = (savedRaw as Record<string, unknown>[]).map((t) => {
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
        createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      };
    });

    const upcomingUserIds = [...new Set(
      (upcomingRaw as Record<string, unknown>[]).flatMap((t) => [
        t.assigneeId as string,
        t.creatorId as string,
      ]).filter(Boolean)
    )];

    const upcomingUsers = upcomingUserIds.length > 0
      ? (await db.collection(collections.users).find({
          $or: [
            { id: { $in: upcomingUserIds } },
            { _id: { $in: upcomingUserIds.map((id) => { try { return new (require("mongodb").ObjectId)(id); } catch { return id; } }) } },
          ],
        }).project({ _id: 1, id: 1, name: 1, image: 1 }).toArray()) as unknown as Record<string, unknown>[]
      : [];

    const upcomingUserMap = new Map<string, { name: string; image: string }>();
    for (const u of upcomingUsers) {
      const uid = (u.id as string) || (u._id as { toString: () => string })?.toString() || "";
      if (uid && !upcomingUserMap.has(uid)) {
        upcomingUserMap.set(uid, { name: (u.name as string) || "", image: (u.image as string) || "" });
      }
    }

    upcomingTasks = (upcomingRaw as Record<string, unknown>[]).map((t) => {
      const assigneeId = (t.assigneeId as string) || "";
      const creatorId = (t.creatorId as string) || "";
      const assignee = assigneeId ? upcomingUserMap.get(assigneeId) : null;
      const creator = creatorId ? upcomingUserMap.get(creatorId) : null;
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
    } catch (e) {
      console.error("[OverviewPage] data fetch error:", e);
    }
  }

  return (
    <OverviewClient
      overviewTasks={overviewTasks}
      currentUserId={currentUserId}
      teamTasks={teamTasks}
      allTasks={allTasks}
      orgId={orgId || ""}
      myTasks={myTasks}
      userId={currentUserId}
      savedTasks={savedTasks}
      upcomingTasks={upcomingTasks}
    />
  );
}
