import { NewNav } from "@/components/landing/new-nav";
import  ComingSoonBlock from "@/components/coming-soon-block";
import { NewsletterBlock } from "@/components/landing/newsletter-block";
import { NewFooter } from "@/components/landing/new-footer";

export default function Home() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col items-center justify-center">
        <ComingSoonBlock />
        <NewsletterBlock />
      </main>
      <NewFooter />
    </>
  );
}
