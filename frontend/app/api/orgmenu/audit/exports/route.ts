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
  if (!orgId) return NextResponse.json({ exports: [] });
  try {
    const raw = await db.collection("audit_exports").find({ orgId }).sort({ createdAt: -1 }).toArray();
    const exports = (raw as any[]).map((e) => ({
      id: e.id || e._id?.toString() || "", format: e.format || "csv", status: e.status || "",
      createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ exports });
  } catch { return NextResponse.json({ exports: [] }); }
}
