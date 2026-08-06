"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { useFileData } from "@/hooks/file-system/use-file-data";
import { useKeyboardShortcuts } from "@/hooks/file-system/use-keyboard";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/lib/file-system/types";
import { ROLES } from "@/lib/rbac";

import { DriveToolbar } from "./components/drive-toolbar";
import { DriveGrid } from "./components/file-grid";
import { DriveList } from "./components/file-list";
import { DetailsPanel } from "./components/details-panel";
import { DriveNewFab } from "./components/drive-new";
import { DriveSkeleton, DriveEmpty, DriveError } from "./components/drive-states";
import { PreviewDialog } from "./components/preview-dialog";
import { PreviewPane } from "./components/preview-pane";
import { ShareDialog } from "./components/share-dialog";
import { PropertiesPanel } from "./components/properties-panel";
import { RecycleBin } from "./components/recycle-bin";
import { AuditLogView } from "./components/audit-log";
import { RecentView } from "./components/recent-view";
import { FavoritesView } from "./components/favorites-view";
import { SharedWithMe } from "./components/shared-view";
import { ClientFilesView } from "./components/client-files-view";
import { StaffFilesView } from "./components/staff-files-view";
import { TeamFilesView } from "./components/team-files-view";
import { StorageDashboard } from "./components/storage-dashboard";
import { ApprovalFilesView } from "./components/approval-files-view";
import { CreateFolderDialog, RenameDialog, MoveDialog } from "./components/dialogs";
import { UploadDialog } from "./components/upload-queue";
import { FileSearch } from "./components/file-search";
import { RiUploadCloud2Line } from "@/lib/icons";
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
  const selectedIds = useFileSystemStore((s) => s.selectedIds);
  const files = useFileSystemStore((s) => s.files);
  const folders = useFileSystemStore((s) => s.folders);
  const { loading, error, refetch } = useFileData();

  const [searchOpen, setSearchOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsFile, setDetailsFile] = useState<FileItem | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragDepth = useRef(0);

  useKeyboardShortcuts();

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

  useEffect(() => {
    useFileSystemStore.getState().setOrgContext(orgId, userId, userRole);
  }, [orgId, userId, userRole]);

  useEffect(() => {
    useFileSystemStore.getState().setPreviewPaneFile(null);
    setDetailsOpen(false);
    setDetailsFile(null);
  }, [currentNav]);

  useEffect(() => {
    if (previewPaneFile) setDetailsFile(previewPaneFile);
  }, [previewPaneFile]);

  const handleNew = useCallback((action: "upload" | "folder") => {
    if (action === "folder") {
      useFileSystemStore.getState().setIsCreatingFolder(true);
    } else {
      useFileSystemStore.getState().setShowUpload(true);
    }
  }, []);

  const onToggleDetails = useCallback(() => {
    setDetailsOpen((open) => {
      const next = !open;
      if (next) {
        const selFile = files.find((f) => selectedIds.has(f.id) && selectedIds.size === 1);
        setDetailsFile(previewPaneFile || selFile || null);
      }
      return next;
    });
  }, [files, selectedIds, previewPaneFile]);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    if (dragDepth.current === 1) setIsDraggingOver(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDraggingOver(false);
    }
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setIsDraggingOver(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length > 0 && userRole !== ROLES.CLIENTS) {
        useFileSystemStore.getState().setPendingFiles(dropped);
        useFileSystemStore.getState().setShowUpload(true);
      }
    },
    [userRole]
  );

  const contentEmpty = folders.length === 0 && files.length === 0 && !loading;

  return (
    <div
      className="relative flex h-full w-full min-h-0 overflow-hidden bg-background"
      data-tour-step-id="step-files"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {previewPaneFile ? (
        <PreviewPane onClose={() => useFileSystemStore.getState().setPreviewPaneFile(null)} />
      ) : (
        <>
          <main className="flex min-w-0 flex-1 flex-col">
            <DriveToolbar
              detailsOpen={detailsOpen}
              onToggleDetails={onToggleDetails}
              searchOpen={searchOpen}
              onSearchFocus={() => {}}
              onNew={handleNew}
            />

            {currentNav === "files" && (
              <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="h-full flex-1 overflow-y-auto">
                    <div className="px-4 py-5 sm:px-6 lg:px-8">
                      {loading ? (
                        <DriveSkeleton viewMode={viewMode} />
                      ) : error ? (
                        <DriveError message={(error as Error)?.message} onRetry={() => refetch()} />
                      ) : contentEmpty ? (
                        <DriveEmpty hasFolders={folders.length > 0} readonly={userRole === ROLES.CLIENTS} onNew={handleNew} />
                      ) : viewMode === "grid" ? (
                        <DriveGrid />
                      ) : (
                        <DriveList />
                      )}
                    </div>
                  </div>
                </div>
                {detailsOpen && (
                  <div className="hidden lg:block">
                    <DetailsPanel file={detailsFile} onClose={() => setDetailsOpen(false)} />
                  </div>
                )}
              </div>
            )}

            {currentNav !== "files" && (
              <div className="min-h-0 flex-1">
                <div className="h-full overflow-y-auto p-4 sm:p-6">
                  {currentNav === "approvals" && <ApprovalFilesView />}
                  {currentNav === "recent" && <RecentView />}
                  {currentNav === "favorites" && <FavoritesView />}
                  {currentNav === "shared" && <SharedWithMe />}
                  {currentNav === "recycle" && <RecycleBin />}
                  {currentNav === "audit" && <AuditLogView />}
                  {currentNav === "team" && <TeamFilesView />}
                  {currentNav === "client-files" && <ClientFilesView />}
                  {currentNav === "staff-files" && <StaffFilesView />}
                  {currentNav === "storage" && <StorageDashboard orgId={orgId} />}
                </div>
              </div>
            )}

            <DriveNewFab onNew={handleNew} />
          </main>
        </>
      )}

      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary px-14 py-12 bg-primary/5">
            <div className="grid size-16 place-items-center rounded-2xl border border-primary bg-background text-primary">
              <RiUploadCloud2Line className="size-8" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Drop files to upload</p>
              <p className="text-sm text-muted-foreground">Files will be uploaded to the current folder</p>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateFolderDialog />
      <RenameDialog />
      <MoveDialog />
      <UploadDialog />
      <PreviewDialog />
      <ShareDialog />
      <PropertiesPanel />

      {searchOpen && (
        <FileSearch
          orgId={orgId}
          onSelectFile={(fileId) => {
            useFileSystemStore.getState().setPreviewFile(
              useFileSystemStore.getState().files.find((f) => f.id === fileId) || null
            );
            setSearchOpen(false);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
});