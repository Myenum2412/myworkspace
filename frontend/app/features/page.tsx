import { Metadata } from "next";

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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold">Features</h1>
      <p className="mt-4 text-muted-foreground">Coming soon.</p>
    </main>
  );
}
