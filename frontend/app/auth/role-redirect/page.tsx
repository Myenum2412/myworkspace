import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function RoleRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?error=Session+not+found.+Please+sign+in+again.");
  }

  const role = session.user.role?.toLowerCase() || "";
  const isOrgAdmin = role === "org_menu_admin" || role === "super_admin";

  if (isOrgAdmin) {
    redirect("/orgmenu");
  }

  const isWorkspaceAdmin = ["workspace", "admin", "manager"].includes(role);

  if (isWorkspaceAdmin) {
    redirect("/dashboard");
  }

  redirect("/staffs");
}
