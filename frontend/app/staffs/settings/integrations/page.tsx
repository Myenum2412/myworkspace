import { auth } from "@/lib/auth/config";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "@/app/settings/integrations/integrations-client";

export const dynamic = "force-dynamic";

export default async function StaffIntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pt-4 pb-0">
        <h1 className="text-2xl font-bold">Calendar Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Google Calendar and Outlook to view events alongside your tasks.
        </p>
      </div>
      <IntegrationsClient
        userId={session.user.id}
        userName={session.user.name || "User"}
        userEmail={session.user.email || ""}
      />
    </div>
  );
}
