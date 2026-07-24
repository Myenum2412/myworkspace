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
  if (!orgId) return NextResponse.json({ members: [] });
  try {
    const memberDocs = await db.collection(collections.orgMembers).find({ orgId }).toArray();
    const userIds = (memberDocs as any[]).map((m) => m.userId).filter(Boolean);
    const users = userIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: userIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map((u) => [u.id, u]));
    const members = (memberDocs as any[]).map((m) => {
      const u = userMap.get(m.userId) || {} as any;
      return { userId: m.userId, role: m.role || "staffs", name: u.name || "Unknown", email: u.email || "", avatar: u.image || "", status: u.status || "offline" };
    });
    return NextResponse.json({ members });
  } catch { return NextResponse.json({ members: [] }); }
}
