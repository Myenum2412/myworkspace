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
  if (!orgId) return NextResponse.json({ requests: [] });
  try {
    const raw = await db.collection("time_off_requests").find({ orgId }).sort({ createdAt: -1 }).toArray();
    const userIds = (raw as any[]).map((r) => r.userId).filter(Boolean);
    const users = userIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: userIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map((u) => [u.id, u.name || u.email]));

    const requests = (raw as any[]).map((r) => ({
      id: r.id || r._id?.toString() || "",
      userId: r.userId || "",
      requesterName: userMap.get(r.userId) || "Unknown Staff",
      type: r.type || "",
      startDate: r.startDate || "",
      endDate: r.endDate || "",
      status: r.status || "",
      reason: r.reason || "",
    }));
    return NextResponse.json({ requests });
  } catch { return NextResponse.json({ requests: [] }); }
}
