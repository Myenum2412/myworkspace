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
  if (!orgId) return NextResponse.json({ post: null });
  try {
    const { id } = await params;
    const post = await db.collection("blog_posts").findOne({ id, orgId }) as any;
    return NextResponse.json({ post: post ? { id: post.id || post._id?.toString() || "", title: post.title || "", content: post.content || "", slug: post.slug || "", status: post.status || "draft" } : null });
  } catch { return NextResponse.json({ post: null }); }
}
