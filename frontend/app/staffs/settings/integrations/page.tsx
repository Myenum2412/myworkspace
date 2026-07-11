import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "@/app/settings/integrations/integrations-client";

export const dynamic = "force-dynamic";

export default async function StaffIntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <IntegrationsClient
        userId={session.user.id}
        userName={session.user.name || "User"}
        userEmail={session.user.email || ""}
      />
    </div>
  );
}
