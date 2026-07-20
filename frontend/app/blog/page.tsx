import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const revalidate = 30;
export const metadata: Metadata = {
  title: "Blog — MyWorkSpace Insights, Tutorials & Updates",
  description: "Read the latest articles on project management, team collaboration, workspace productivity, rebar detailing, and business automation from the MyWorkSpace team.",
  keywords: ["blog", "project management tips", "team collaboration", "workspace productivity", "rebar detailing tutorials", "business automation"],
  openGraph: {
    title: "Blog — MyWorkSpace Insights & Updates",
    description: "Latest articles on project management, team collaboration, and business automation.",
    type: "website",
    siteName: "MyWorkSpace",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — MyWorkSpace Insights & Updates",
    description: "Latest articles on project management, team collaboration, and business automation.",
  },
  robots: { index: true, follow: true },
};

interface BlogPost {
  _id: string;
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  featuredImage?: string;
  authorName: string;
  authorAvatar?: string;
  publishedAt: Date;
  readingTime: number;
  categories: string[];
  tags: string[];
  views: number;
  featured: boolean;
  status: string;
  orgId: string;
}

async function getBlogPosts(params: { page?: string; category?: string; search?: string }) {
  const page = Math.max(1, parseInt(params.page || "1"));
  const limit = 12;
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = { status: "published" };
  if (params.category) filter.categories = params.category;
  if (params.search) {
    filter.$or = [
      { title: { $regex: params.search, $options: "i" } },
      { tags: { $regex: params.search, $options: "i" } },
    ];
  }

  try {
    const [posts, total] = await Promise.all([
      db.collection("blog_posts")
        .find(filter)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({ content: 0, versions: 0 })
        .toArray(),
      db.collection("blog_posts").countDocuments(filter),
    ]);

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch {
    return { data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } };
  }
}

async function getBlogCategories() {
  try {
    const categories = await db.collection("blog_categories")
      .find({})
      .sort({ name: 1 })
      .toArray();
    return categories;
  } catch {
    return [];
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

function BlogCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 h-full">
        {post.featuredImage && (
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardContent className="p-6 flex flex-col flex-1">
          <div className="flex flex-wrap gap-2 mb-3">
            {post.categories?.slice(0, 2).map((cat: string) => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
          <h3 className="text-xl font-semibold line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          {post.subtitle && (
            <p className="text-muted-foreground text-sm line-clamp-1 mb-2">{post.subtitle}</p>
          )}
          <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">{post.excerpt}</p>
          <div className="flex items-center gap-3 mt-auto">
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.authorAvatar} />
              <AvatarFallback className="text-xs">{getInitials(post.authorName || "A")}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <span className="font-medium">{post.authorName}</span>
              <span className="text-muted-foreground ml-2">
                {formatDate(post.publishedAt)} · {post.readingTime} min read
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        <div className="grid md:grid-cols-2 gap-0">
          {post.featuredImage && (
            <div className="relative aspect-video md:aspect-auto overflow-hidden">
              <Image
                src={post.featuredImage}
                alt={post.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          <CardContent className="p-8 flex flex-col justify-center">
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge className="text-xs">Featured</Badge>
              {post.categories?.slice(0, 2).map((cat: string) => (
                <Badge key={cat} variant="secondary" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
            <h2 className="text-2xl font-bold line-clamp-2 mb-3 group-hover:text-primary transition-colors">
              {post.title}
            </h2>
            <p className="text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.authorAvatar} />
                <AvatarFallback>{getInitials(post.authorName || "A")}</AvatarFallback>
              </Avatar>
              <div className="text-sm">
                <span className="font-medium">{post.authorName}</span>
                <span className="text-muted-foreground block">
                  {formatDate(post.publishedAt)} · {post.readingTime} min read
                </span>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const [postsResult, categories] = await Promise.all([
    getBlogPosts(params),
    getBlogCategories(),
  ]);

  const posts = (postsResult.data || []) as unknown as BlogPost[];
  const pagination = postsResult.pagination;
  const featuredPost = posts.find(p => p.featured);
  const regularPosts = featuredPost ? posts.filter(p => p.id !== featuredPost.id) : posts;

  return (
    <div className="min-h-screen bg-background">
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">Blog</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Insights, tutorials, and updates from our team
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <form className="flex-1" action="/blog" method="get">
            {params.category && <input type="hidden" name="category" value={params.category} />}
            <Input type="search" name="search" placeholder="Search articles..." defaultValue={params.search} />
          </form>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            <Link href="/blog">
              <Badge variant={!params.category ? "default" : "outline"} className="cursor-pointer">All</Badge>
            </Link>
            {categories.map((cat: any) => (
              <Link key={cat.slug} href={`/blog?category=${cat.name}`}>
                <Badge variant={params.category === cat.name ? "default" : "outline"} className="cursor-pointer">
                  {cat.name} ({cat.postCount || 0})
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {featuredPost && !params.search && !params.category && (
          <div className="mb-12">
            <FeaturedPost post={featuredPost} />
          </div>
        )}

        {regularPosts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {regularPosts.map(post => (
              <BlogCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No articles found</p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
              <Link
                key={page}
                href={`/blog?page=${page}${params.category ? `&category=${params.category}` : ""}${params.search ? `&search=${params.search}` : ""}`}
              >
                <Button variant={page === pagination.page ? "default" : "outline"} size="sm">{page}</Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
