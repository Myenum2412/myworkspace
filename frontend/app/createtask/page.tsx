import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { CreateTaskPageInteractive } from "./page-interactive";

export const metadata = {
  title: "Create Task",
};
export const dynamic = "force-dynamic";

export default async function CreateTaskPage() {
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
      <CreateTaskPageInteractive />
    </main>
  );
}
