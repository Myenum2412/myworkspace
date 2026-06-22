import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";

export default async function RoleRedirectPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?error=Session+not+found.+Please+sign+in+again.");
  }

  const role = session.user.role;
  console.log(`[AUTH role-redirect] email=${session.user.email} role=${role}`);

  if (role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN") {
    redirect("/orgmenu");
  }

  if (role === "ADMIN") {
    redirect("/dashboard");
  }

  // Fallback: any authenticated user lands on dashboard
  redirect("/dashboard");
}
