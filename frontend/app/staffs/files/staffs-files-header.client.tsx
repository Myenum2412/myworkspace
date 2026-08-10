"use client";

import { useCallback, useEffect, useState } from "react";
import { CreateFolderDialog } from "@/app/files/components/dialogs";
import { DriveToolbar } from "@/app/files/components/drive-toolbar";
import { UploadDialog } from "@/app/files/components/upload-queue";
import { useFileData } from "@/hooks/file-system/use-file-data";
import { useFileSystemStore } from "@/lib/file-system/store";

type StaffFilesHeaderProps = {
  orgId: string;
  userId: string;
  userRole: string;
};

export default function StaffFilesHeader({ orgId, userId, userRole }: StaffFilesHeaderProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useFileData();

  useEffect(() => {
    useFileSystemStore.getState().setOrgContext(orgId, userId, userRole);
  }, [orgId, userId, userRole]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNew = useCallback((action: "upload" | "folder") => {
    if (action === "folder") {
      useFileSystemStore.getState().setIsCreatingFolder(true);
    } else {
      useFileSystemStore.getState().setShowUpload(true);
    }
  }, []);

  const onToggleDetails = useCallback(() => {
    setDetailsOpen((open) => !open);
  }, []);

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col overflow-hidden bg-background">
      <DriveToolbar
        detailsOpen={detailsOpen}
        onToggleDetails={onToggleDetails}
        searchOpen={searchOpen}
        onSearchFocus={() => {}}
        onNew={handleNew}
      />

      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">
          Use the toolbar above to search, sort, and filter your files.
        </p>
      </div>

      <CreateFolderDialog />
      <UploadDialog />
    </div>
  );
}
