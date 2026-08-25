import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id } = await params;
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const team = oid
    ? await db.collection(collections.teams).findOne({ _id: oid, orgId })
    : await db.collection(collections.teams).findOne({ id, orgId });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamIdStr = team._id.toString();
  const members = (await db
    .collection(collections.teamMembers)
    .find({ teamId: teamIdStr })
    .toArray()) as any[];
  const userIds = members.map((m: any) => m.userId).filter(Boolean);
  const objectIds = userIds
    .map((id: string) => {
      try {
        return new ObjectId(id);
      } catch {
        return null;
      }
    })
    .filter((id: ObjectId | null): id is ObjectId => id !== null);
  const query =
    objectIds.length > 0
      ? { $or: [{ id: { $in: userIds } }, { _id: { $in: objectIds } }] }
      : { id: { $in: userIds } };
  const users =
    userIds.length > 0 ? await db.collection(collections.users).find(query).toArray() : [];
  const userMap = new Map<string, any>();
  for (const u of users as any[]) {
    if (u.id) userMap.set(u.id, u);
    if (u._id) userMap.set(u._id.toString(), u);
  }
  const enrichedMembers = members.map((m: any) => {
    const u = userMap.get(m.userId) || {};
    return {
      id: m._id.toString(),
      userId: m.userId,
      name: u.name || "Unknown",
      email: u.email || "",
      avatar: u.image || "",
      status: u.status || "offline",
      department: u.department || "",
      designation: u.designation || "",
      role: m.role || "team_staff",
    };
  });
  return NextResponse.json({
    success: true,
    data: {
      id: teamIdStr,
      name: team.name,
      description: team.description || "",
      createdAt: team.createdAt,
      members: enrichedMembers,
    },
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id } = await params;
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
  const description = (body.description || "").trim();
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const query = oid ? { _id: oid, orgId } : { id, orgId };
  const result = await db.collection(collections.teams).updateOne(query, {
    $set: { name, description, updatedAt: new Date(), updatedBy: session.user.id },
  });
  if (result.matchedCount === 0)
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id } = await params;
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const query = oid ? { _id: oid, orgId } : { id, orgId };
  const team = await db.collection(collections.teams).findOne(query);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamIdStr = team._id.toString();
  await Promise.all([
    db.collection(collections.teamMembers).deleteMany({ teamId: teamIdStr }),
    db.collection(collections.teams).deleteOne(query),
  ]);
  return NextResponse.json({ success: true });
}
