import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function RoleRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?error=Session+not+found.+Please+sign+in+again.");
  }

  const role = session.user.role;
  const isOrgAdmin = role === "ORG_MENU_ADMIN" || role === "SUPER_ADMIN";

  if (isOrgAdmin) {
    redirect("/orgmenu");
  }

  redirect("/dashboard");
}
