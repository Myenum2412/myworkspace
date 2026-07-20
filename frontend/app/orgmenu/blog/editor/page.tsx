import { Metadata } from "next";
import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { BlogEditorClient } from "./client";

export const metadata: Metadata = {
  title: "New Blog Post | OrgMenu",
  description: "Create a new blog post",
};

export default async function NewBlogPostPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  if (role !== "org_admin" && role !== "members" && role !== "manager") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Blog Post</h1>
        <p className="text-muted-foreground">Create a new blog post</p>
      </div>
      <BlogEditorClient
        orgId={(session.user as any).orgId || ""}
        userId={session.user.id}
        userName={session.user.name || session.user.email || "Admin"}
      />
    </div>
  );
}
