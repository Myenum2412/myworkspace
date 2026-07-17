import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import BlogBlock from "@/components/blog-block";

export default function BlogPage() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col">
        <BlogBlock />
      </main>
      <NewFooter />
    </>
  );
}
