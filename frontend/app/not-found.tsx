import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import ErrorBlock from "@/components/error-block";

export default function NotFoundPage() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col">
        <ErrorBlock />
      </main>
      <NewFooter />
    </>
  );
}
