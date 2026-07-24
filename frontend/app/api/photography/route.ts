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
  if (!orgId) return NextResponse.json({ galleries: [] });
  try {
    const raw = await db.collection("galleries").find({ orgId }).sort({ createdAt: -1 }).toArray();
    const galleries = (raw as any[]).map((g) => ({
      id: g.id || g._id?.toString() || "", name: g.name || "", description: g.description || "",
      photoCount: (g.photos || []).length, createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ orgId, galleries });
  } catch { return NextResponse.json({ galleries: [] }); }
}
