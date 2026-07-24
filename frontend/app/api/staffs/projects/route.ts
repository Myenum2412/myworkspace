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
  if (!orgId) return NextResponse.json({ projects: [] });
  try {
    const raw = await db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).toArray();
    const projects = (raw as any[]).map((p) => ({
      id: p.id || p._id?.toString() || "", name: p.name || "", status: p.status || "Active",
      progress: Number(p.progress ?? 0), client: p.client || "",
    }));
    return NextResponse.json({ projects });
  } catch { return NextResponse.json({ projects: [] }); }
}
