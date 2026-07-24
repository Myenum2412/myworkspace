"use client";

import { useSession } from "next-auth/react";
import { FileManagerClient } from "@/app/files/file-manager-client";

export default function StaffFilesPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

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
      userRole={session.user.role || "staffs"}
    />
  );
}
