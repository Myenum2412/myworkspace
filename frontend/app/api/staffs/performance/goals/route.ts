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
  if (!orgId) return NextResponse.json({ goals: [] });
  try {
    const raw = await db.collection("goals").find({ orgId }).sort({ createdAt: -1 }).toArray();
    const goals = (raw as any[]).map((g) => ({
      id: g.id || g._id?.toString() || "", title: g.title || "", status: g.status || "",
      progress: g.progress || 0, dueDate: g.dueDate || null,
    }));
    return NextResponse.json({ goals });
  } catch { return NextResponse.json({ goals: [] }); }
}
