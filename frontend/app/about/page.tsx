import { Metadata } from "next";

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
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold">About</h1>
      <p className="mt-4 text-muted-foreground">Coming soon.</p>
    </main>
  );
}
