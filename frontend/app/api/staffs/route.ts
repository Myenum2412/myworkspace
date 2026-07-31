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
  if (!orgId) return NextResponse.json({ employees: [], teams: [] });
  try {
    const [memberDocs, teamDocs] = await Promise.all([
      db.collection(collections.orgMembers).find({ orgId }).toArray(),
      db.collection(collections.teams).find({ orgId }).toArray(),
    ]);
    const userIds = (memberDocs as any[]).map((m) => m.userId).filter(Boolean);
    let users: any[] = [];
    if (userIds.length > 0) {
      const objectIds = userIds.map((id) => { try { return new ObjectId(id); } catch { return null; } }).filter((id): id is ObjectId => id !== null);
      const query = objectIds.length > 0
        ? { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }] }
        : { id: { $in: userIds } };
      users = await db.collection(collections.users).find(query).toArray();
    }
    const userMap = new Map(users.map((u: any) => [u.id || u._id?.toString(), u]));
    const employees = (memberDocs as any[]).map((m) => {
      const u = userMap.get(m.userId) || {} as any;
      return { id: m.userId, name: u.name || "", email: u.email || "", role: m.role || "staffs", status: u.status || "offline", department: u.department || "", designation: u.designation || "", avatar: u.image || "" };
    });
    const teams = (teamDocs as any[]).map((t) => ({ id: t.id || t._id?.toString() || "", name: t.name || "", description: t.description || "" }));
    return NextResponse.json({ employees, teams });
  } catch { return NextResponse.json({ employees: [], teams: [] }); }
}
