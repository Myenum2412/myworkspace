import { NewNav } from "@/components/landing/new-nav";
import { NewFooter } from "@/components/landing/new-footer";
import ChangelogBlock from "@/components/changelog-block";

export default function NewUpdatePage() {
  return (
    <>
      <NewNav />
      <main className="flex min-h-screen flex-col pt-16">
        <ChangelogBlock />
      </main>
      <NewFooter />
    </>
  );
}
