import { Metadata } from "next";
import HeroBlock from "@/components/hero-block";
import { NewsletterBlock } from "@/components/landing/newsletter-block";
import { HeroSection2 } from "@/components/landing/hero-section-2";
import AboutPage from "./about/page";

export const metadata: Metadata = {
  title: "MyWorkSpace — Enterprise Workspace Management Platform",
  description: "Transform your business with MyWorkSpace — the all-in-one platform for project management, team collaboration, task tracking, employee management, rebar detailing, and business automation. Free to start.",
  keywords: ["workspace management", "project management", "team collaboration", "task tracking", "employee management", "business automation", "SaaS platform", "rebar detailing"],
  openGraph: {
    title: "MyWorkSpace — Enterprise Workspace Management Platform",
    description: "All-in-one platform for project management, team collaboration, task tracking, and business automation.",
    type: "website",
    siteName: "MyWorkSpace",
  },
  twitter: {
    card: "summary_large_image",
    title: "MyWorkSpace — Enterprise Workspace Management Platform",
    description: "All-in-one platform for project management, team collaboration, and business automation.",
  },
  robots: { index: true, follow: true },
};

export default function Home() {
  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center">
        <HeroBlock />
        <AboutPage />
        <HeroSection2 />
        <NewsletterBlock />
      </main>
    </>
  );
}
