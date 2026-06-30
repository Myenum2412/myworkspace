import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import StaffFilesInteractive from "./staffs-files-interactive";

export const dynamic = "force-dynamic";

export default async function StaffFilesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  return <StaffFilesInteractive orgId={orgId || ""} />;
}
