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
  if (!orgId) return NextResponse.json({ reviews: [] });
  try {
    const raw = await db.collection("performance_reviews").find({ orgId }).sort({ createdAt: -1 }).toArray();
    const userIds = (raw as any[]).map((r) => r.employeeId).filter(Boolean);
    const users = userIds.length > 0 ? await db.collection(collections.users).find({ id: { $in: userIds } }).toArray() : [];
    const userMap = new Map((users as any[]).map((u) => [u.id, u.name || u.email]));
    
    const reviews = (raw as any[]).map((r) => ({
      id: r.id || r._id?.toString() || "",
      employeeId: r.employeeId || "",
      employeeName: userMap.get(r.employeeId) || "Unknown Employee",
      score: r.score || 0,
      comments: r.comments || "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ reviews });
  } catch { return NextResponse.json({ reviews: [] }); }
}
