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
  if (!orgId) return NextResponse.json({ posts: [] });
  try {
    const raw = await db.collection("blog_posts").find({ orgId }).sort({ createdAt: -1 }).toArray();
    const posts = (raw as any[]).map((p) => ({
      id: p.id || p._id?.toString() || "", title: p.title || "", slug: p.slug || "",
      status: p.status || "draft", createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ posts });
  } catch { return NextResponse.json({ posts: [] }); }
}
