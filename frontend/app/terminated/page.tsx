import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import TerminatedInteractive from "./terminated-interactive";

export const dynamic = "force-dynamic";

export default async function TerminatedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <TerminatedInteractive />;
}
