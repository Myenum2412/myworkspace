import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ initialTasks: [], orgId: "", sessionUserId: session.user.id });
  try {
    const teamMemberships = await db.collection(collections.teamMembers)
      .find({ orgId, userId: session.user.id })
      .toArray();
    const teamIds = [...new Set((teamMemberships as any[]).map((m) => m.teamId).filter(Boolean))];
    const taskMatch = {
      orgId,
      $or: [
        { assigneeId: session.user.id },
        { creatorId: session.user.id },
        ...(teamIds.length > 0 ? [{ type: "team", teamId: { $in: teamIds } }] : []),
      ],
    };

    const raw = await db.collection(collections.tasks).aggregate([
      { $match: taskMatch },
      { $sort: { createdAt: -1 } },
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
    ]).toArray();

    const rawTeamIds = [...new Set((raw as any[]).map((t) => t.teamId).filter(Boolean))];
    const objectTeamIds = rawTeamIds
      .map((id) => { try { return new ObjectId(String(id)); } catch { return null; } })
      .filter((id): id is ObjectId => id !== null);
    const teamQuery = objectTeamIds.length > 0
      ? { orgId, $or: [{ id: { $in: rawTeamIds } }, { _id: { $in: objectTeamIds } }] }
      : { orgId, id: { $in: rawTeamIds } };
    const teamDocs = rawTeamIds.length > 0
      ? await db.collection(collections.teams).find(teamQuery).toArray()
      : [];
    const teamMap = new Map((teamDocs as any[]).flatMap((t) => {
      const keys = [t.id, t._id?.toString()].filter(Boolean);
      return keys.map((key) => [key, t.name || ""] as const);
    }));

    const initialTasks = (raw as any[]).map((t) => ({
      _id: t._id?.toString() || "",
      id: t.id || t._id?.toString() || "",
      orgId: t.orgId || orgId,
      title: t.title || "",
      description: t.description || "",
      type: t.type || "individual",
      status: t.status || "",
      priority: t.priority || "",
      project: t.project || "",
      dueDate: t.dueDate || null,
      assigneeId: t.assigneeId || "",
      assigneeName: t.assignee?.name || "",
      assigneeAvatar: t.assignee?.image || "",
      creatorId: t.creatorId || "",
      creatorName: t.creator?.name || "",
      teamId: t.teamId || "",
      teamName: t.teamId ? teamMap.get(t.teamId) || "" : "",
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
      updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : "",
    }));
    return NextResponse.json({ initialTasks, orgId, sessionUserId: session.user.id });
  } catch { return NextResponse.json({ initialTasks: [], orgId, sessionUserId: session.user.id }); }
}
