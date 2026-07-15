import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";

export default function SolutionsPage() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col pt-16">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Solutions</h1>
          <p className="mt-4 text-lg text-muted-foreground">Tailored solutions for your team.</p>
        </div>
      </main>
      <NewFooter />
    </>
  );
}
