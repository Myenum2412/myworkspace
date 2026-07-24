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
  if (!orgId) return NextResponse.json({ clientList: [] });
  try {
    const projects = await db.collection(collections.projects).find({ orgId }).toArray();
    const clientList = [...new Set((projects as any[]).map((p) => p.client as string).filter(Boolean))];
    return NextResponse.json({ clientList });
  } catch { return NextResponse.json({ clientList: [] }); }
}
