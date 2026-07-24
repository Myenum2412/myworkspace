"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BlogManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated") {
      fetch("/api/orgmenu/blog").then(r => r.json()).then(d => setPosts(d.posts || [])).catch(() => {}).finally(() => setLoading(false));
    }
  }, [status, router]);

  if (status === "loading" || loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Blog Management</h1>
        <Button asChild><Link href="/orgmenu/blog/editor">New Post</Link></Button>
      </div>
      <Card><CardHeader><CardTitle>Posts</CardTitle></CardHeader><CardContent>
        {posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts</p> : posts.map((p) => (
          <div key={p.id || p._id} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="font-medium">{p.title}</span>
            <Badge>{p.status || "draft"}</Badge>
          </div>
        ))}
      </CardContent></Card>
    </main>
  );
}
