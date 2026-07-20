import { auth } from "@/lib/auth/config";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUserOrgId } from "@/lib/org";
import { BlogEditorClient } from "../client";

async function getBlogPost(postId: string, orgId: string) {
  try {
    const post = await db.collection("blog_posts").findOne({ id: postId, orgId });
    return post;
  } catch {
    return null;
  }
}

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "org_admin" && role !== "members" && role !== "manager") {
    redirect("/dashboard");
  }

  const orgId = await getUserOrgId(session.user.id, session.user.email || undefined);
  if (!orgId) redirect("/dashboard");

  const post = await getBlogPost(id, orgId);
  if (!post) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Blog Post</h1>
        <p className="text-muted-foreground">Editing: {post.title}</p>
      </div>
      <BlogEditorClient
        orgId={orgId}
        userId={session.user.id}
        userName={session.user.name || session.user.email || "Admin"}
        initialPost={{
          id: post.id,
          title: post.title,
          subtitle: post.subtitle,
          content: post.content,
          excerpt: post.excerpt,
          featuredImage: post.featuredImage,
          categories: post.categories || [],
          tags: post.tags || [],
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          seoKeywords: post.seoKeywords || [],
          canonicalUrl: post.canonicalUrl,
          featured: post.featured || false,
          status: post.status,
        }}
      />
    </div>
  );
}
