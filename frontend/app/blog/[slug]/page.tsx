import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import ArticleBlock from "@/components/article-block";
import { notFound } from "next/navigation";

const blogPosts: Record<string, { title: string; category: string }> = {
  "cut-api-latency-edge-caching": {
    title: "How we cut API latency by 60% with edge caching",
    category: "Engineering",
  },
  "token-system-survives-rebrand": {
    title: "Building a token system that survives a rebrand",
    category: "Design",
  },
  "user-interviews-onboarding": {
    title: "What 1,200 user interviews taught us about onboarding",
    category: "Product",
  },
};

export function generateStaticParams() {
  return Object.keys(blogPosts).map((slug) => ({ slug }));
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts[slug];

  if (!post) {
    notFound();
  }

  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col">
        <ArticleBlock />
      </main>
      <NewFooter />
    </>
  );
}
