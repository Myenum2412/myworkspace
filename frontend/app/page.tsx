"use client";

import dynamic from "next/dynamic";
import HeroBlock from "@/components/hero-block";
import FeaturesBlock from "@/components/features-block";
import { Safari } from "@/components/ui/safari";

const NewsletterBlock = dynamic(() => import("@/components/landing/newsletter-block").then(m => ({ default: m.NewsletterBlock })), { loading: () => null });
const HeroSection2 = dynamic(() => import("@/components/landing/hero-section-2").then(m => ({ default: m.HeroSection2 })), { loading: () => null });
const AboutPage = dynamic(() => import("./about/page"), { loading: () => null });

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <HeroBlock />
      <HeroSection2 />
      <div className="w-full max-w-7xl px-6 py-32">
        <Safari url="https://myworkspace.myenum.in/dashboard" imageSrc="/dashboard.png" className="rounded-lg" />
      </div>
      <FeaturesBlock />
      <NewsletterBlock />
    </main>
  );
}
