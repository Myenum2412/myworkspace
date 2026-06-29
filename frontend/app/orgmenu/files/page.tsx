import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { ClientFileManager } from "./client-file-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client File Manager" };

export default async function OrgMenuFilesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">You must be signed in to view client files.</p>
      </div>
    );
  }

  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">No organization found for your account.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ClientFileManager orgId={orgId} userId={session.user.id} />
    </div>
  );
}
