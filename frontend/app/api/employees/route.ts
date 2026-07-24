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
  if (!orgId) return NextResponse.json({ employees: [], teams: [], teamMembers: [] });

  try {
    const user = { name: session.user.name || "User", email: session.user.email || "", avatar: session.user.image || "" };
    const allOrgMembers = await db.collection(collections.orgMembers).find({ orgId }).toArray() as any[];
    const userIds = [...new Set(allOrgMembers.map((m) => m.userId).filter(Boolean))];

    let employees: any[] = [];
    if (userIds.length > 0) {
      const objectIds = userIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter((id): id is ObjectId => id !== null);
      const query = objectIds.length > 0
        ? { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }] }
        : { id: { $in: userIds } };
      const users = await db.collection(collections.users).find(query).toArray();
      const userMap = new Map(users.map((u: any) => [u.id || u._id?.toString(), u]));

      employees = allOrgMembers
        .filter((m) => userMap.has(m.userId))
        .map((m) => {
          const u = userMap.get(m.userId)!;
          return {
            id: u.id || u._id?.toString() || "", name: u.name || "Unknown", email: u.email || "",
            role: m.role || u.role || "staffs", status: u.status || "offline", department: u.department || "",
            designation: u.designation || "", employmentType: u.employmentType || "", phone: u.phone || "",
            branchName: u.branchName || "", joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString() : "",
            avatar: u.image || u.avatar || "",
          };
        });
    }

    const [teamDocs, orgMemberDocs] = await Promise.all([
      db.collection(collections.teams).aggregate([
        { $match: { orgId } },
        { $addFields: { _teamIdStr: { $toString: "$_id" } } },
        { $lookup: { from: collections.teamMembers, let: { teamIdStr: "$_teamIdStr" }, pipeline: [{ $match: { $expr: { $eq: ["$teamId", "$$teamIdStr"] } } }], as: "members" } },
        { $addFields: { memberCount: { $size: "$members" }, memberIds: "$members.userId" } },
        { $project: { _id: 0, _teamIdStr: 0 } }, { $sort: { createdAt: -1 } },
      ]).toArray(),
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
    ]);

    const allTeamMemberIds = (teamDocs as any[]).flatMap((t) => t.memberIds || []).filter(Boolean);
    const uniqueMemberIds = [...new Set(allTeamMemberIds)];
    let memberUserMap = new Map<string, any>();
    if (uniqueMemberIds.length > 0) {
      const memberUserDocs = await db.collection(collections.users).find({ id: { $in: uniqueMemberIds } }).toArray();
      for (const u of memberUserDocs) { if (u.id) memberUserMap.set(u.id, u); }
    }

    const teams = (teamDocs as any[]).map((t) => ({
      id: String(t.id || ""), name: t.name || "", description: t.description || "", memberCount: t.memberCount || 0,
      members: (t.members || []).map((m: any) => ({
        userId: m.userId, name: memberUserMap.get(m.userId)?.name || "Unknown",
        email: memberUserMap.get(m.userId)?.email || "", avatar: memberUserMap.get(m.userId)?.image || "",
        role: m.role || "team_staff",
      })),
      createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : "",
    }));

    const teamMembers = (orgMemberDocs as any[]).map((m) => {
      const u = memberUserMap.get(m.userId) || {};
      return { userId: m.userId, name: u.name || "", email: u.email || "", avatar: u.image || "", role: m.role || "staffs" };
    });

    return NextResponse.json({ employees, user, teams, teamMembers, orgId });
  } catch { return NextResponse.json({ employees: [], teams: [], teamMembers: [] }); }
}
