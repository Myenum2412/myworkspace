import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TimeTracker from "./time-tracker-interactive";

export const dynamic = "force-dynamic";

export default async function TimeTrackerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  return (
    <TimeTracker
      user={{
        name: (session.user.name as string) || "Demo User",
        email: (session.user.email as string) || "demo@example.com",
        avatar: (session.user.image as string) || "",
        id: session.user.id,
      }}
      orgId={orgId || "org1"}
    />
  );
}
