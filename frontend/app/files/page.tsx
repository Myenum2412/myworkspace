import { auth } from "@/lib/auth/config";
import { requireUserOrgId } from "@/lib/org";
import { FileManagerClient } from "./file-manager-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "File Manager | MyWorkSpace" };

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-muted-foreground">You must be signed in to access the file manager.</p>
      </div>
    );
  }

  const sessionOrgId = (session.user as Record<string, unknown>)?.orgId as string | undefined;
  let orgId: string | null = null;
  try {
    orgId = await requireUserOrgId(session.user.id, session.user.email, sessionOrgId);
  } catch {
    // Fallback to session orgId if DB lookup fails
    orgId = sessionOrgId || null;
  }

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
      userRole={session.user.role || "staffs"}
    />
  );
}
