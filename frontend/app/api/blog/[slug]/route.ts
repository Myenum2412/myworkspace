import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await db.collection("blog_posts").findOne({ slug }) as any;
    if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ post: { id: post.id || post._id?.toString() || "", title: post.title || "", slug: post.slug || "", content: post.content || "", excerpt: post.excerpt || "", coverImage: post.coverImage || "", author: post.author || "", createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : "" } });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
