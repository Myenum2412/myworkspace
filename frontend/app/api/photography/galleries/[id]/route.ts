import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try { session = await auth(); } catch { return NextResponse.json({ error: "Auth unavailable" }, { status: 503 }); }
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) return NextResponse.json({ gallery: null });
  try {
    const { id } = await params;
    const gallery = await db.collection("galleries").findOne({ id, orgId }) as any;
    if (!gallery) return NextResponse.json({ gallery: null });
    return NextResponse.json({ gallery: { id: gallery.id || gallery._id?.toString() || "", name: gallery.name || "", description: gallery.description || "", photos: gallery.photos || [] } });
  } catch { return NextResponse.json({ gallery: null }); }
}
