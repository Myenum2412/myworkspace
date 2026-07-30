import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ObjectId } from "mongodb";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id, userId } = await params;
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const query = oid ? { _id: oid, orgId } : { id, orgId };
  const team = await db.collection(collections.teams).findOne(query);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamIdStr = team._id.toString();
  await db.collection(collections.teamMembers).deleteOne({ teamId: teamIdStr, userId });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ error: "No org found" }, { status: 400 });
  const { id, userId } = await params;
  const oid = ObjectId.isValid(id) ? new ObjectId(id) : null;
  const query = oid ? { _id: oid, orgId } : { id, orgId };
  const team = await db.collection(collections.teams).findOne(query);
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  const teamIdStr = team._id.toString();
  const body = await req.json();
  const { role } = body;
  if (!role || !["team_lead", "team_staff"].includes(role)) return NextResponse.json({ error: "Valid role required (team_lead or team_staff)" }, { status: 400 });
  if (role === "team_lead") {
    await db.collection(collections.teamMembers).updateMany(
      { teamId: teamIdStr, role: "team_lead" },
      { $set: { role: "team_staff" } }
    );
  }
  await db.collection(collections.teamMembers).updateOne(
    { teamId: teamIdStr, userId },
    { $set: { role } }
  );
  return NextResponse.json({ success: true });
}
