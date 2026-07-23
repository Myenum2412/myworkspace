import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import ReworksInteractive from "@/app/staffs/reworks/reworks-interactive";

export const dynamic = "force-dynamic";

export default async function ReworksPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user?.id) redirect("/login");

  return <ReworksInteractive />;
}
