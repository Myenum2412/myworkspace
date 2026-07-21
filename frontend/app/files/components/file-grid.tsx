"use client";

import { useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import { getFileIcon } from "@/components/files/utils";
import { formatSize, type FileItem, type FolderItem } from "@/lib/file-system/types";
import {
  FolderIcon,
  FolderPlusIcon,
  MoreHorizontalIcon,
  StarIcon,
  LockIcon,
  DownloadIcon,
  Trash2Icon,
  PencilIcon,
  Share2Icon,
  EyeIcon,
  CopyIcon,
  ScissorsIcon,
  ArrowRightIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ROLES } from "@/lib/rbac";
import * as api from "@/lib/file-system/api";
import { apiFetch } from "@/lib/api";

function FileThumbnail({ file, className }: { file: FileItem; className?: string }) {
  const [error, setError] = useState(false);
  const isImage = file.mimeType.startsWith("image/");
  const thumbSrc = `/api/files/thumbnail/${file.id}?size=medium`;

  if (isImage && !error) {
    return (
      <div className={cn("size-full", className)}>
        <img
          src={thumbSrc}
          alt={file.originalName}
          className="size-full object-cover"
          loading="lazy"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("size-16 flex items-center justify-center", className)}>
      {getFileIcon(file.mimeType)}
    </div>
  );
}

function FolderCard({ folder, onDoubleClick }: { folder: FolderItem; onDoubleClick: () => void }) {
  const { selectedIds, toggleSelection, setCurrentFolder, setRenameTarget, setPropertiesTarget, setMoveTarget, setClipboard, currentFolderId } = useFileSystemStore();
  const userRole = useFileSystemStore((s) => s.userRole);
  const readonly = userRole === ROLES.CLIENTS;
  const selected = selectedIds.has(folder.id);

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onDoubleClick={onDoubleClick}
          onClick={(e) => { if (e.ctrlKey || e.metaKey) toggleSelection(folder.id); }}
          className={cn(
            "group relative flex flex-col items-center gap-2 p-4 cursor-pointer transition-all select-none",
            selected && "ring-2 ring-primary bg-primary/5",
            "hover:border-primary/30 hover:shadow-sm",
          )}
        >
          <div className={cn(
            "size-16 rounded-2xl flex items-center justify-center transition-colors",
            folder.color || "bg-primary/5",
          )}>
            <FolderIcon className="size-8 text-primary/70" />
          </div>
          <div className="text-center min-w-0 w-full">
            <p className="text-xs font-medium truncate">{folder.name}</p>
          </div>
          {selected && (
            <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] text-primary-foreground font-bold">✓</span>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onDoubleClick}>
          <EyeIcon className="size-3.5 mr-2" /> Open
        </ContextMenuItem>
        {!readonly && (
          <ContextMenuItem onClick={() => setRenameTarget({ type: "folder", id: folder.id, name: folder.name })}>
            <PencilIcon className="size-3.5 mr-2" /> Rename
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => setClipboard({ ids: [folder.id], action: "copy" })}>
            <CopyIcon className="size-3.5 mr-2" /> Copy
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => setClipboard({ ids: [folder.id], action: "cut" })}>
            <ScissorsIcon className="size-3.5 mr-2" /> Cut
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => setMoveTarget({ type: "folder", id: folder.id })}>
            <ArrowRightIcon className="size-3.5 mr-2" /> Move
          </ContextMenuItem>
        )}
        {!readonly && <ContextMenuSeparator />}
        <ContextMenuItem onClick={() => setPropertiesTarget({ type: "folder", id: folder.id })}>
          <FolderIcon className="size-3.5 mr-2" /> Properties
        </ContextMenuItem>
        {!readonly && <ContextMenuSeparator />}
        {!readonly && (
          <ContextMenuItem
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete folder "${folder.name}"?`)) {
                useFileSystemStore.getState().removeFolder(folder.id);
                api.deleteFolder(folder.id).catch(console.error);
              }
            }}
          >
            <Trash2Icon className="size-3.5 mr-2" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function FileCard({ file }: { file: FileItem }) {
  const { selectedIds, toggleSelection, setPreviewFile, setPreviewPaneFile, previewPaneFile, setShareFile, setRenameTarget, setPropertiesTarget, setClipboard } = useFileSystemStore();
  const userRole = useFileSystemStore((s) => s.userRole);
  const readonly = userRole === ROLES.CLIENTS;
  const selected = selectedIds.has(file.id);
  const isPaneActive = previewPaneFile?.id === file.id;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) toggleSelection(file.id);
            else setPreviewPaneFile(file);
          }}
          onDoubleClick={() => setPreviewFile(file)}
          className={cn(
            "group relative flex flex-col items-center gap-2 p-4 cursor-pointer transition-all select-none",
            selected && "ring-2 ring-primary bg-primary/5",
            isPaneActive && "ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
            "hover:border-primary/30 hover:shadow-sm",
          )}
        >
          <FileThumbnail file={file} />
          <div className="text-center min-w-0 w-full">
            <p className="text-xs font-medium truncate">{file.originalName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{formatSize(file.size)}</p>
          </div>
          {file.isFavorite && <StarIcon className="absolute top-2 left-2 size-3 fill-amber-400 text-amber-400" />}
          {file.isLocked && <LockIcon className="absolute top-2 right-2 size-3 text-muted-foreground" />}
          {selected && (
            <div className="absolute top-2 right-2 size-5 rounded-full bg-primary flex items-center justify-center">
              <span className="text-[10px] text-primary-foreground font-bold">✓</span>
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => setPreviewFile(file)}>
          <EyeIcon className="size-3.5 mr-2" /> Preview
        </ContextMenuItem>
        <ContextMenuItem onClick={async () => {
          try {
            const res = await apiFetch(`/api/files/presigned/download/${file.id}`);
            const data = await res.json();
            window.open(data.data?.url || `/api/files/${file.id}/download`, "_blank");
          } catch {
            window.open(`/api/files/${file.id}/download`, "_blank");
          }
        }}>
          <DownloadIcon className="size-3.5 mr-2" /> Download
        </ContextMenuItem>
        {!readonly && (
          <ContextMenuItem onClick={() => setRenameTarget({ type: "file", id: file.id, name: file.originalName })}>
            <PencilIcon className="size-3.5 mr-2" /> Rename
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => setClipboard({ ids: [file.id], action: "copy" })}>
            <CopyIcon className="size-3.5 mr-2" /> Copy
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => setClipboard({ ids: [file.id], action: "cut" })}>
            <ScissorsIcon className="size-3.5 mr-2" /> Cut
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => setShareFile(file)}>
            <Share2Icon className="size-3.5 mr-2" /> Share
          </ContextMenuItem>
        )}
        {!readonly && (
          <ContextMenuItem onClick={() => {
            api.duplicateFile(file.id).catch(console.error)
              .then(() => useFileSystemStore.getState().removeFile(file.id));
          }}>
            <CopyIcon className="size-3.5 mr-2" /> Duplicate
          </ContextMenuItem>
        )}
        {!readonly && <ContextMenuSeparator />}
        <ContextMenuItem onClick={() => setPropertiesTarget({ type: "file", id: file.id })}>
          <FolderIcon className="size-3.5 mr-2" /> Properties
        </ContextMenuItem>
        {!readonly && <ContextMenuSeparator />}
        {!readonly && (
          <ContextMenuItem
            className="text-destructive"
            onClick={() => {
              if (confirm(`Delete "${file.originalName}"?`)) {
                useFileSystemStore.getState().removeFile(file.id);
                api.deleteFile(file.id).catch(console.error);
              }
            }}
          >
            <Trash2Icon className="size-3.5 mr-2" /> Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function FileGrid() {
  const { folders, files, setCurrentFolder, breadcrumbs, setIsCreatingFolder } = useFileSystemStore();
  const userRole = useFileSystemStore((s) => s.userRole);
  const readonly = userRole === ROLES.CLIENTS;

  const content = folders.length === 0 && files.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
      <FolderIcon className="size-16 text-muted-foreground/20" />
      <p className="text-sm">This folder is empty</p>
      <p className="text-xs">Upload files or create a folder to get started</p>
    </div>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          onDoubleClick={() => {
            setCurrentFolder(folder.id);
            useFileSystemStore.getState().setBreadcrumbs([
              ...breadcrumbs,
              { id: folder.id, name: folder.name },
            ]);
          }}
        />
      ))}
      {files.map((file) => (
        <FileCard key={file.id} file={file} />
      ))}
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger>{content}</ContextMenuTrigger>
      <ContextMenuContent>
        {!readonly && (
          <ContextMenuItem onClick={() => setIsCreatingFolder(true)}>
            <FolderPlusIcon className="size-3.5 mr-2" /> Create Folder
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
