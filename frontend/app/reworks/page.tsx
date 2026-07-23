import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import ReworksClient from "./reworks-client";

export const dynamic = "force-dynamic";

export default async function ReworksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <ReworksClient />;
}
