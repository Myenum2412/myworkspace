import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function POST(req: Request) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
    const description = (body.description || "").trim();
    const result = await db.collection(collections.teams).insertOne({
      orgId,
      name,
      description,
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json(
      { success: true, data: { id: result.insertedId.toString(), name } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ teams: [], members: [], orgId: "" });
  try {
    const [teamDocs, memberDocs] = await Promise.all([
      db
        .collection(collections.teams)
        .aggregate([
          { $match: { orgId } },
          { $addFields: { _teamIdStr: { $toString: "$_id" } } },
          {
            $lookup: {
              from: collections.teamMembers,
              let: { teamIdStr: "$_teamIdStr" },
              pipeline: [{ $match: { $expr: { $eq: ["$teamId", "$$teamIdStr"] } } }],
              as: "members",
            },
          },
          { $addFields: { memberCount: { $size: "$members" } } },
          { $addFields: { id: "$_teamIdStr" } },
          { $project: { _id: 0, _teamIdStr: 0 } },
          { $sort: { createdAt: -1 } },
        ])
        .toArray(),
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
    ]);

    const allTeamMemberIds = (teamDocs as any[])
      .flatMap((t) => (t.members || []).map((m: any) => m.userId))
      .filter(Boolean);
    const allOrgMemberIds = (memberDocs as any[]).map((m) => m.userId).filter(Boolean);
    const allUserIds = [...new Set([...allTeamMemberIds, ...allOrgMemberIds])];
    const userMap = new Map<string, any>();
    if (allUserIds.length > 0) {
      const users = await db
        .collection(collections.users)
        .find({ id: { $in: allUserIds } })
        .toArray();
      for (const u of users) {
        if (u.id) userMap.set(u.id, u);
      }
    }

    const teams = (teamDocs as any[]).map((t) => {
      const memberList = (t.members || []).map((m: any) => ({
        userId: m.userId,
        name: userMap.get(m.userId)?.name || "Unknown",
        email: userMap.get(m.userId)?.email || "",
        avatar: userMap.get(m.userId)?.image || "",
        role: m.role || "team_staff",
      }));
      const lead = memberList.find((m: any) => m.role === "team_lead");
      return {
        id: String(t.id || ""),
        name: t.name || "",
        description: t.description || "",
        memberCount: t.memberCount || 0,
        leadName: lead?.name || "",
        leadAvatar: lead?.avatar || "",
        members: memberList,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
      };
    });
    const members = (memberDocs as any[]).map((m) => {
      const u = userMap.get(m.userId) || ({} as any);
      return {
        userId: m.userId,
        name: u.name || "Unknown",
        email: u.email || "",
        avatar: u.image || "",
        role: m.role || "staffs",
      };
    });
    return NextResponse.json({ teams, members, orgId });
  } catch {
    return NextResponse.json({ teams: [], members: [], orgId: "" });
  }
}
