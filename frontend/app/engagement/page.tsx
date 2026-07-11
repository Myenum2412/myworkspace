import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EngagementPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold">Engagement</h1>
    </main>
  );
}
