import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ROLES } from "@/lib/rbac";

export default async function RoleRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?error=Session+not+found.+Please+sign+in+again.");
  }

  const role = session.user.role?.toLowerCase() || "";

  if (role === ROLES.ORG_ADMIN) {
    redirect("/orgmenu");
  }

  if (role === ROLES.MEMBERS) {
    redirect("/dashboard");
  }

  redirect("/staffs");
}
