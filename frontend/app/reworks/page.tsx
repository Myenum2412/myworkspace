import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import ReworksClient from "./reworks-client";

export const dynamic = "force-dynamic";

export default async function ReworksPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user?.id) redirect("/login");

  try {
    return <ReworksClient />;
  } catch (e) {
    console.error("[REWORKS] Error rendering page:", e);
    return <ReworksClient />;
  }
}
