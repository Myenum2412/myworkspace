"use client";

import React, { useEffect, useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { useFileData } from "@/hooks/file-system/use-file-data";
import { useKeyboardShortcuts } from "@/hooks/file-system/use-keyboard";
import { Sidebar } from "./components/sidebar";
import { Toolbar } from "./components/toolbar";
import { BreadcrumbNav } from "./components/breadcrumb-nav";
import { FileGrid } from "./components/file-grid";
import { FileList } from "./components/file-list";
import { UploadZone } from "./components/upload-queue";
import { PreviewDialog } from "./components/preview-dialog";
import { PreviewPane } from "./components/preview-pane";
import { ShareDialog } from "./components/share-dialog";
import { PropertiesPanel } from "./components/properties-panel";
import { RecycleBin } from "./components/recycle-bin";
import { AuditLogView } from "./components/audit-log";
import { SharedWithMe } from "./components/shared-view";
import { FavoritesView } from "./components/favorites-view";
import { RecentView } from "./components/recent-view";
import { ClientFilesView } from "./components/client-files-view";
import { StaffFilesView } from "./components/staff-files-view";
import { CreateFolderDialog, RenameDialog, MoveDialog } from "./components/dialogs";
import { FileSearch } from "./components/file-search";
import { StorageDashboard } from "./components/storage-dashboard";

interface FileManagerClientProps {
  orgId: string;
  userId: string;
  userRole: string;
}

export const FileManagerClient = React.memo(function FileManagerClient({ orgId, userId, userRole }: FileManagerClientProps) {
  const currentNav = useFileSystemStore((s) => s.currentNav);
  const viewMode = useFileSystemStore((s) => s.viewMode);
  const previewFile = useFileSystemStore((s) => s.previewFile);
  const previewPaneFile = useFileSystemStore((s) => s.previewPaneFile);
  const { loading } = useFileData();
  const [searchOpen, setSearchOpen] = useState(false);

  useKeyboardShortcuts();

  useEffect(() => {
    useFileSystemStore.getState().setOrgContext(orgId, userId, userRole);
  }, [orgId, userId, userRole]);

  useEffect(() => {
    useFileSystemStore.getState().setPreviewPaneFile(null);
  }, [currentNav]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {previewPaneFile ? (
        <PreviewPane onClose={() => useFileSystemStore.getState().setPreviewPaneFile(null)} />
      ) : (
        <>
          <Sidebar />

          <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentNav === "files" && (
                <>
                  <div className="flex items-center justify-between">
                    <BreadcrumbNav />
                  </div>
                  <Toolbar readonly={userRole === "client"} />
                  {userRole !== "client" && <UploadZone />}
                  {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : viewMode === "grid" ? (
                    <FileGrid />
                  ) : (
                    <FileList />
                  )}
                </>
              )}

              {currentNav === "shared" && <SharedWithMe />}
              {currentNav === "favorites" && <FavoritesView />}
              {currentNav === "recent" && <RecentView />}
              {currentNav === "recycle" && <RecycleBin />}
              {currentNav === "audit" && <AuditLogView />}
              {currentNav === "client-files" && <ClientFilesView />}
              {currentNav === "staff-files" && <StaffFilesView />}
              {currentNav === "storage" && <StorageDashboard orgId={orgId} />}
            </div>
          </main>
        </>
      )}

      {/* Dialogs and overlays */}
      <CreateFolderDialog />
      <RenameDialog />
      <MoveDialog />
      <PreviewDialog />
      <ShareDialog />
      <PropertiesPanel />

      {searchOpen && (
        <FileSearch
          orgId={orgId}
          onSelectFile={(fileId) => {
            useFileSystemStore.getState().setPreviewFile(
              useFileSystemStore.getState().files.find(f => f.id === fileId) || null
            );
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
});
