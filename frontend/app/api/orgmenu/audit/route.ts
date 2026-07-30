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
  if (!orgId) return NextResponse.json({ logs: [] });
  try {
    const raw = await db.collection("auditlogs").find({ orgId }).sort({ createdAt: -1 }).limit(100).toArray();
    const userIds = [...new Set((raw as any[]).map(l => l.userId).filter(Boolean))];
    const users = userIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: userIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map(u => [u.id, u.name || u.email || "Unknown"]));
    const logs = (raw as any[]).map((l) => ({
      id: l._id?.toString() || "",
      action: l.action || "",
      userId: l.userId || "",
      user: l.userId ? (userMap.get(l.userId) || "Unknown") : "System",
      details: l.description || l.details || "",
      createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ logs });
  } catch { return NextResponse.json({ logs: [] }); }
}

export async function DELETE(req: Request) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }
    const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
    const objectIds = ids.map((id: string) => new ObjectId(id));
    await db.collection("auditlogs").deleteMany({ _id: { $in: objectIds }, orgId });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
