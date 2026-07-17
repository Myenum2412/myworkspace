import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import ComingSoonBlock from "@/components/coming-soon-block";

export default function PlatformPage() {
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
