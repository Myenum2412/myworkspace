import { NewNav } from "@/components/landing/new-nav";
import { HeroSection2 } from "@/components/landing/hero-section-2";
import { NewsletterBlock } from "@/components/landing/newsletter-block";
import { NewFooter } from "@/components/landing/new-footer";

export default function Home() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col items-center justify-center">
        <HeroSection2 />
        <NewsletterBlock />
      </main>
      <NewFooter />
    </>
  );
}
