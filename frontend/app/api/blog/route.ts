import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";

export async function GET() {
  try {
    const raw = await db.collection("blog_posts").find({ status: "published" }).sort({ createdAt: -1 }).toArray();
    const posts = (raw as any[]).map((p) => ({
      id: p.id || p._id?.toString() || "", title: p.title || "", slug: p.slug || "",
      excerpt: p.excerpt || "", content: p.content || "", coverImage: p.coverImage || "",
      author: p.author || "", createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : "",
    }));
    return NextResponse.json({ posts });
  } catch { return NextResponse.json({ posts: [] }); }
}
