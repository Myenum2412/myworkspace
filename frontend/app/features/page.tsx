import { Metadata } from "next";
import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import ComingSoonBlock from "@/components/coming-soon-block";

export const metadata: Metadata = {
  title: "Features — MyWorkSpace Platform Capabilities",
  description: "Explore MyWorkSpace features: project management, task tracking, team collaboration, file management, time tracking, AI assistance, integrations, and enterprise security.",
  keywords: ["features", "project management features", "task tracking", "team collaboration", "file management", "AI assistance", "integrations"],
  openGraph: {
    title: "Features — MyWorkSpace Platform",
    description: "Explore all features of the MyWorkSpace platform.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function FeaturesPage() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col">
        <ComingSoonBlock />
      </main>
      <NewFooter />
    </>
  );
}
