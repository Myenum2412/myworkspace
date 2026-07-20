import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface BlogPost {
  _id: string;
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  content: string;
  excerpt: string;
  featuredImage?: string;
  authorName: string;
  authorAvatar?: string;
  publishedAt: Date;
  readingTime: number;
  categories: string[];
  tags: string[];
  views: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const post = await db.collection("blog_posts").findOne({ slug, status: "published" });
    if (!post) return null;

    // Increment views
    await db.collection("blog_posts").updateOne({ slug }, { $inc: { views: 1 } });

    return post as unknown as BlogPost;
  } catch {
    return null;
  }
}

async function getAdjacentPosts(slug: string) {
  try {
    const posts = await db.collection("blog_posts")
      .find({ status: "published" })
      .sort({ publishedAt: -1 })
      .project({ slug: 1, title: 1 })
      .toArray();

    const idx = posts.findIndex((p: any) => p.slug === slug);
    return {
      prev: idx > 0 ? posts[idx - 1] : null,
      next: idx < posts.length - 1 ? posts[idx + 1] : null,
    };
  } catch {
    return { prev: null, next: null };
  }
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function extractHeadings(content: string) {
  const headings: { level: number; text: string; id: string }[] = [];
  const regex = /<h([2-4])[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const level = parseInt(match[1]);
    const text = match[2].replace(/<[^>]*>/g, "");
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    headings.push({ level, text, id });
  }
  return headings;
}

function TableOfContents({ headings }: { headings: { level: number; text: string; id: string }[] }) {
  if (headings.length < 3) return null;
  return (
    <nav className="sticky top-24">
      <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Table of Contents</h3>
      <ul className="space-y-2 text-sm">
        {headings.map((h, i) => (
          <li key={i} style={{ paddingLeft: `${(h.level - 2) * 16}px` }}>
            <a href={`#${h.id}`} className="text-muted-foreground hover:text-foreground transition-colors">{h.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article Not Found — MyWorkSpace" };

  // Enforce character limits: title max 60, description max 160
  const title = (post.seoTitle || post.title).substring(0, 60);
  const description = (post.seoDescription || post.excerpt || "").substring(0, 160);

  return {
    title: `${title} — MyWorkSpace Blog`,
    description,
    keywords: post.seoKeywords || post.tags || [],
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.publishedAt instanceof Date ? post.publishedAt.toISOString() : String(post.publishedAt),
      authors: [post.authorName],
      siteName: "MyWorkSpace",
      images: post.featuredImage ? [{ url: post.featuredImage, alt: post.title, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
    robots: { index: true, follow: true },
    alternates: { canonical: `https://myworkspace.myenum.in/blog/${slug}` },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, adjacentPosts] = await Promise.all([
    getBlogPost(slug),
    getAdjacentPosts(slug),
  ]);

  if (!post) notFound();

  const headings = extractHeadings(post.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt instanceof Date ? post.publishedAt.toISOString() : String(post.publishedAt),
    author: { "@type": "Person", name: post.authorName },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="min-h-screen bg-background">
        {post.featuredImage && (
          <div className="relative w-full aspect-[21/9] max-h-[500px] overflow-hidden">
            <Image src={post.featuredImage} alt={post.title} fill className="object-cover" priority sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/blog" className="hover:text-foreground">Blog</Link>
              <span>/</span>
              <span className="text-foreground truncate">{post.title}</span>
            </nav>

            <div className="flex flex-wrap gap-2 mb-4">
              {post.categories?.map((cat: string) => (
                <Badge key={cat} variant="secondary">{cat}</Badge>
              ))}
            </div>

            <h1 className="text-4xl font-bold mb-3">{post.title}</h1>
            {post.subtitle && <p className="text-xl text-muted-foreground mb-6">{post.subtitle}</p>}

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={post.authorAvatar} />
                  <AvatarFallback>{getInitials(post.authorName || "A")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{post.authorName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(post.publishedAt)} · {post.readingTime} min read · {(post.views || 0).toLocaleString()} views
                  </p>
                </div>
              </div>
            </div>

            <Separator className="mb-8" />

            <div className="grid lg:grid-cols-[1fr_220px] gap-8">
              <div className="prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: post.content }} />
              {headings.length > 0 && (
                <aside className="hidden lg:block">
                  <TableOfContents headings={headings} />
                </aside>
              )}
            </div>

            {post.tags?.length > 0 && (
              <div className="mt-12 mb-8">
                <h3 className="font-semibold mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-8" />

            <div className="grid sm:grid-cols-2 gap-4 mb-12">
              {adjacentPosts.prev ? (
                <Link href={`/blog/${(adjacentPosts.prev as any).slug}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <p className="text-sm text-muted-foreground mb-1">← Previous</p>
                    <p className="font-medium line-clamp-2">{(adjacentPosts.prev as any).title}</p>
                  </Card>
                </Link>
              ) : <div />}
              {adjacentPosts.next && (
                <Link href={`/blog/${(adjacentPosts.next as any).slug}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow text-right">
                    <p className="text-sm text-muted-foreground mb-1">Next →</p>
                    <p className="font-medium line-clamp-2">{(adjacentPosts.next as any).title}</p>
                  </Card>
                </Link>
              )}
            </div>

            <div className="text-center">
              <Button asChild variant="outline">
                <Link href="/blog">← Back to Blog</Link>
              </Button>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
