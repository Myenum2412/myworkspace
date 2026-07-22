import { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getUserOrgId } from "@/lib/org";
import { BlogDataTable } from "./components/BlogDataTable";

export const metadata: Metadata = {
  title: "Blog Management | OrgMenu",
  description: "Manage your blog posts, categories, and content.",
};

async function getBlogPosts(orgId: string) {
  try {
    const posts = await db.collection("blog_posts")
      .find({ orgId })
      .sort({ createdAt: -1 })
      .limit(100)
      .project({ versions: 0 })
      .toArray();
    return posts;
  } catch {
    return [];
  }
}

async function getBlogCategories(orgId: string) {
  try {
    const categories = await db.collection("blog_categories")
      .find({ orgId })
      .sort({ name: 1 })
      .toArray();
    return categories;
  } catch {
    return [];
  }
}

export default async function BlogAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "org_admin" && role !== "members" && role !== "manager") {
    redirect("/dashboard");
  }

  const orgId = await getUserOrgId(session.user.id, session.user.email || undefined);
  if (!orgId) redirect("/dashboard");

  const [posts, categories] = await Promise.all([
    getBlogPosts(orgId),
    getBlogCategories(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground">Create, edit, and manage your blog posts</p>
        </div>
        <a
          href="/orgmenu/blog/editor"
          className="inline-flex items-center justify-center rounded-sm bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          New Post
        </a>
      </div>

      <BlogDataTable initialPosts={posts as any[]} categories={categories as any[]} orgId={orgId} />
    </div>
  );
}
