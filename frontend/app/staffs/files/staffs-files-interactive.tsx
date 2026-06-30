"use client";

import { useSession } from "next-auth/react";
import { FileExplorer } from "@/components/file-explorer";

type StaffFilesInteractiveProps = {
  orgId: string;
};

export default function StaffFilesInteractive({ orgId }: StaffFilesInteractiveProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id || "";

  return (
    <div className="space-y-6">
      {orgId ? (
        <FileExplorer orgId={orgId} userId={userId} />
      ) : (
        <p className="text-sm text-muted-foreground">No organization found.</p>
      )}
    </div>
  );
}
