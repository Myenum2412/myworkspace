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
  if (!orgId) return NextResponse.json({ logs: [] });
  try {
    const raw = await db.collection("audit_logs").find({ orgId }).sort({ createdAt: -1 }).limit(100).toArray();
    const logs = (raw as any[]).map((l) => ({
      id: l.id || l._id?.toString() || "", action: l.action || "", userId: l.userId || "",
      details: l.details || "", createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ logs });
  } catch { return NextResponse.json({ logs: [] }); }
}
