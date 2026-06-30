import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { OnboardingInteractive } from "./onboarding-interactive";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?error=Please+sign+in+to+complete+onboarding");
  }

  const isOrgAdmin =
    session.user.role === "ORG_MENU_ADMIN" ||
    session.user.role === "SUPER_ADMIN";

  if (isOrgAdmin) {
    redirect("/orgmenu");
  }

  if (session.user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return <OnboardingInteractive />;
}
