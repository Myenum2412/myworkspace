"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import type { FileItem, FolderItem } from "@/lib/file-system/types";
import { formatSize } from "@/lib/file-system/types";
import { ROLES } from "@/lib/rbac";
import { CheckIcon, FolderPlusIcon } from "@/lib/icons";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DriveTile, DriveFolderTile, DriveOverflowMenu, FileMenu, FolderMenu } from "./drive-menu";

function useListState() {
  const selectedIds = useFileSystemStore((s) => s.selectedIds);
  const toggleSelection = useFileSystemStore((s) => s.toggleSelection);
  const setCurrentFolder = useFileSystemStore((s) => s.setCurrentFolder);
  const setPreviewFile = useFileSystemStore((s) => s.setPreviewFile);
  const setPreviewPaneFile = useFileSystemStore((s) => s.setPreviewPaneFile);
  const setIsCreatingFolder = useFileSystemStore((s) => s.setIsCreatingFolder);
  const selectedIdsInList = useFileSystemStore((s) => s.selectedIds);
  return { selectedIds, toggleSelection, setCurrentFolder, setPreviewFile, setPreviewPaneFile, setIsCreatingFolder };
}

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
}

function FolderCard({ folder, onOpen }: { folder: FolderItem; onOpen: () => void }) {
  const { selectedIds, toggleSelection } = useListState();
  const readonly = useFileSystemStore((s) => s.userRole) === ROLES.CLIENTS;
  const selected = selectedIds.has(folder.id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={() => toggleSelection(folder.id)}
          onDoubleClick={onOpen}
          className={cn(
            "group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border transition-all duration-200",
            selected
              ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30"
              : "border-border/80 bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-px"
          )}
        >
          <div className="relative h-32 w-full border-b border-border/50">
            <DriveFolderTile folder={folder} />
            <div className="absolute right-1.5 top-1.5">
              <DriveOverflowMenu kind="folder" item={folder} />
            </div>
          </div>
          <div className="px-3 py-2.5">
            <p className={cn("truncate text-[13px] font-medium text-foreground")}>{folder.name}</p>
<p className="mt-0.5 text-[11px] text-muted-foreground">
              {formatDate(folder.updatedAt || folder.createdAt)}
            </p>
          </div>
          {selected && (
            <div className="absolute left-2 top-2 z-20 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
              <CheckIcon className="size-3" />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onOpen}>Open</ContextMenuItem>
        <FolderMenu folder={folder} variant="context" />
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FileCard({ file }: { file: FileItem }) {
  const { selectedIds, toggleSelection } = useListState();
  const selected = selectedIds.has(file.id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={() => toggleSelection(file.id)}
          onDoubleClick={() => useFileSystemStore.getState().setPreviewFile(file)}
          className={cn(
            "group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border transition-all duration-200",
            selected
              ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30"
              : "border-border/80 bg-card hover:border-primary/30 hover:shadow-md hover:-translate-y-px"
          )}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <DriveTile file={file} />
            <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <DriveOverflowMenu kind="file" item={file} />
            </div>
          </div>
          <div className="px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-foreground">{file.originalName}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {file.uploaderName ? `${file.uploaderName} · ` : ""}
              {formatSize(file.size)}
            </p>
          </div>
          {selected && (
            <div className="absolute left-2 top-2 z-20 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground shadow-md">
              <CheckIcon className="size-3" />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => useFileSystemStore.getState().setPreviewFile(file)}>Open preview</ContextMenuItem>
        <FileMenu file={file} variant="context" />
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function DriveGrid() {
  const { folders, files, setCurrentFolder, breadcrumbs, setIsCreatingFolder } = useFileSystemStore();
  const readonly = useFileSystemStore((s) => s.userRole) === ROLES.CLIENTS;

  const openFolder = (folder: FolderItem) => {
    setCurrentFolder(folder.id);
    useFileSystemStore.getState().setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 p-0.5">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} onOpen={() => openFolder(folder)} />
          ))}
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {!readonly && (
          <ContextMenuItem onClick={() => setIsCreatingFolder(true)}>
            <FolderPlusIcon className="size-4 mr-2.5" /> New folder
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}