import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ teams: [], members: [], orgId: "" });
  try {
    const [teamDocs, memberDocs] = await Promise.all([
      db.collection(collections.teams).aggregate([
        { $match: { orgId } },
        { $addFields: { _teamIdStr: { $toString: "$_id" } } },
        { $lookup: { from: collections.teamMembers, let: { teamIdStr: "$_teamIdStr" }, pipeline: [{ $match: { $expr: { $eq: ["$teamId", "$$teamIdStr"] } } }], as: "members" } },
        { $addFields: { memberCount: { $size: "$members" } } },
        { $project: { _id: 0, _teamIdStr: 0 } }, { $sort: { createdAt: -1 } },
      ]).toArray(),
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
    ]);
    const teams = (teamDocs as any[]).map((t) => ({
      id: String(t.id || ""), name: t.name || "", description: t.description || "",
      memberCount: t.memberCount || 0, createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
    }));
    const memberUserIds = (memberDocs as any[]).map((m) => m.userId).filter(Boolean);
    const users = memberUserIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: memberUserIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map((u) => [u.id, u]));
    const members = (memberDocs as any[]).map((m) => {
      const u = userMap.get(m.userId) || {} as any;
      return { userId: m.userId, name: u.name || "Unknown", email: u.email || "", avatar: u.image || "", role: m.role || "staffs" };
    });
    return NextResponse.json({ teams, members, orgId });
  } catch { return NextResponse.json({ teams: [], members: [], orgId: "" }); }
}
