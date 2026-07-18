import { auth } from "@/lib/auth/config";
import { FileManagerClient } from "../../files/file-manager-client";

export const dynamic = "force-dynamic";

export default async function ClientFileManagerPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">You must be signed in to access the file manager.</p>
      </div>
    );
  }

  const orgId = (session.user as Record<string, unknown>)?.orgId as string | undefined;
  if (!orgId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">No organization found for your account.</p>
      </div>
    );
  }

  return (
    <FileManagerClient
      orgId={orgId}
      userId={session.user.id}
      userRole="client"
    />
  );
}
