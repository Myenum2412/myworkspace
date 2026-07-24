"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/blog").then(r => r.json()).then(d => setPosts(d.posts || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 min-w-0 max-w-full">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <p className="text-sm text-muted-foreground">Latest articles and updates</p>
      </div>
      <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-4">
                <h3 className="font-semibold line-clamp-2">{post.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center gap-2 mt-4">
                  <Avatar className="size-6"><AvatarFallback>{post.author?.[0] || "A"}</AvatarFallback></Avatar>
                  <span className="text-xs text-muted-foreground">{post.author}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
