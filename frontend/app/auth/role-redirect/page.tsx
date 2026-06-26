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
    console.log(`[AUTH role-redirect] email=${session.user.email} role=${role} → /orgmenu`);
    redirect("/orgmenu");
  }

  const userId = session.user.id;
  const org = await db.collection("organizations").findOne({ ownerId: userId });
  if (org && !org.onboardingCompleted) {
    console.log(`[AUTH role-redirect] email=${session.user.email} onboarding not completed → /onboarding`);
    redirect("/onboarding");
  }

  console.log(`[AUTH role-redirect] email=${session.user.email} role=${role} -> /dashboard`);
  redirect("/dashboard");
}
