import { Metadata } from "next";

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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Solutions</h1>
      <p className="mt-4 text-muted-foreground">Coming soon.</p>
    </main>
  );
}
