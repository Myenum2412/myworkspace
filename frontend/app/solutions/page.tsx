import { Metadata } from "next";
import ComingSoonBlock from "@/components/coming-soon-block";

export const metadata: Metadata = {
  title: "Solutions — MyWorkSpace for Every Industry",
  description: "Discover how MyWorkSpace solves project management, team collaboration, HR management, client management, and construction industry challenges.",
  keywords: ["solutions", "project management solution", "team collaboration solution", "construction management", "HR management solution"],
  openGraph: {
    title: "Solutions — MyWorkSpace for Every Industry",
    description: "Discover how MyWorkSpace solves your business challenges.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function SolutionsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <ComingSoonBlock />
    </main>
  );
}
