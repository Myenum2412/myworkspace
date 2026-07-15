import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { CreateProjectPageInteractive } from "./page-interactive";

export const metadata = {
  title: "Create Project",
};

export default async function CreateProjectPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      <CreateProjectPageInteractive />
    </main>
  );
}
