"use client";

import { use } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/blog/${slug}`).then(r => r.json()).then(d => setPost(d.post)).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>;
  if (!post) return <div className="flex flex-1 items-center justify-center p-8"><p>Post not found</p></div>;

  return (
    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <Button variant="ghost" asChild className="w-fit"><Link href="/blog"><ArrowLeftIcon className="size-4 mr-2" />Back to Blog</Link></Button>
      <h1 className="text-3xl font-bold">{post.title}</h1>
      {post.excerpt && <p className="text-muted-foreground text-lg">{post.excerpt}</p>}
      <div className="prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: post.content }} />
    </main>
  );
}
