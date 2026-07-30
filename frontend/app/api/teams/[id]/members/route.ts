import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id } = await params;
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const query = oid ? { _id: oid, orgId } : { id, orgId };
  const team = await db.collection(collections.teams).findOne(query);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamIdStr = team._id.toString();
  const members = await db.collection(collections.teamMembers).find({ teamId: teamIdStr }).toArray() as any[];
  const userIds = [...new Set(members.map((m: any) => m.userId).filter(Boolean))];
  const users = userIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: userIds } }).toArray() : [];
  const userMap = new Map(users.map((u: any) => [u.id, u]));
  const enrichedMembers = members.map((m: any) => {
    const u = userMap.get(m.userId) || {};
    return { id: m._id.toString(), userId: m.userId, name: u.name || "Unknown", email: u.email || "", avatar: u.image || "", role: m.role || "team_staff" };
  });
  return NextResponse.json({ success: true, data: enrichedMembers });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id } = await params;
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const query = oid ? { _id: oid, orgId } : { id, orgId };
  const team = await db.collection(collections.teams).findOne(query);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamIdStr = team._id.toString();
  const body = await req.json();
  const { userId, role } = body;
  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  const existing = await db.collection(collections.teamMembers).findOne({ teamId: teamIdStr, userId });
  if (existing) return NextResponse.json({ error: "User is already a member of this team" }, { status: 400 });
  const { v4: uuid } = await import("uuid");
  const result = await db.collection(collections.teamMembers).insertOne({
    id: uuid(), orgId, teamId: teamIdStr, userId,
    role: role || "team_staff", createdBy: session.user.id, createdAt: new Date(),
  });
  return NextResponse.json({ success: true, data: { id: result.insertedId.toString() } }, { status: 201 });
}
