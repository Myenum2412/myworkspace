import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "./integrations-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <IntegrationsClient
      userId={session.user.id}
      userName={session.user.name || "User"}
      userEmail={session.user.email || ""}
    />
  );
}
