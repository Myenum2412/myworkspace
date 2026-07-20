import { Metadata } from "next";
import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import ComingSoonBlock from "@/components/coming-soon-block";

export const metadata: Metadata = {
  title: "About Us — MyWorkSpace Team & Mission",
  description: "Learn about MyWorkSpace — our mission to transform workspace management, project collaboration, and business automation for teams worldwide.",
  keywords: ["about MyWorkSpace", "company mission", "team collaboration platform", "workspace management company"],
  openGraph: {
    title: "About Us — MyWorkSpace",
    description: "Learn about MyWorkSpace and our mission.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function AboutPage() {
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
