"use client";

import React, { useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { getFileIcon, getFileTypeColor } from "@/components/files/utils";
import { type FileItem, type FolderItem } from "@/lib/file-system/types";
import { ROLES } from "@/lib/rbac";
import * as api from "@/lib/file-system/api";
import { cn } from "@/lib/utils";
import {
  StarIcon,
  FolderIcon,
  EyeIcon,
  DownloadIcon,
  PencilIcon,
  CopyIcon,
  ScissorsIcon,
  Share2Icon,
  ArrowRightIcon,
  Trash2Icon,
  InfoIcon,
  MoreHorizontalIcon,
} from "@/lib/icons";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenu,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/file-system/use-favorites";
import { DeleteConfirmDialog } from "@/components/dialog-03";

type MenuVariant = "dropdown" | "context";

async function downloadFile(fileId: string) {
  try {
    const res = await fetch(`/api/files/presigned/download/${fileId}`, { credentials: "include" });
    const data = await res.json();
    window.open(data.data?.url || `/api/files/${fileId}/download`, "_blank");
  } catch {
    window.open(`/api/files/${fileId}/download`, "_blank");
  }
}

/** Full-colour, Drive-like tile. Real thumbnail for images, otherwise a type tile. */
export function DriveTile({ file, className }: { file: FileItem; className?: string }) {
  const [error, setError] = useState(false);
  const isImage = file.mimeType.startsWith("image/") && !error;

  if (isImage) {
    return (
      <div className={cn("h-full w-full overflow-hidden", className)}>
        <img
          src={`/api/files/thumbnail/${file.id}?size=medium`}
          alt={file.originalName}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          loading="lazy"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  const typeColor = getFileTypeColor(file.mimeType, file.originalName);

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-white to-gray-50 dark:from-card dark:to-card/40",
        className
      )}
    >
      <div className={cn("grid size-14 place-items-center rounded-xl shadow-sm", typeColor)}>
        {getFileIcon(file.mimeType, file.originalName)}
      </div>
    </div>
  );
}

export function DriveFolderTile({ folder, className }: { folder: FolderItem; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[color-mix(in_oklch,var(--primary)_7%,transparent)]",
        className
      )}
    >
      <FolderIcon className={cn("size-12", folder.color ? `text-${folder.color}` : "text-primary/70")} />
    </div>
  );
}

function isDropdown(variant: MenuVariant) {
  return variant === "dropdown";
}

function Item({ variant, children, className, onSelect }: { variant: MenuVariant; children: React.ReactNode; className?: string; onSelect?: () => void }) {
  if (isDropdown(variant)) {
    return (
      <DropdownMenuItem className={className} onSelect={onSelect}>
        {children}
      </DropdownMenuItem>
    );
  }
  return (
    <ContextMenuItem className={className} onSelect={onSelect}>
      {children}
    </ContextMenuItem>
  );
}

/** Consistent set of actions for a single file, rendered for menus or context menus. */
export function FileMenu({ file, variant }: { file: FileItem; variant: MenuVariant }) {
  const readonly = useFileSystemStore((s) => s.userRole) === ROLES.CLIENTS;
  const { toggleFavorite } = useFavorites();
  return (
    <>
      <Item variant={variant} onSelect={() => useFileSystemStore.getState().setPreviewFile(file)}>
        <EyeIcon className="size-4 mr-2.5" /> Open preview
      </Item>
      <Item variant={variant} onSelect={() => downloadFile(file.id)}>
        <DownloadIcon className="size-4 mr-2.5" /> Download
      </Item>
      <Item variant={variant} onSelect={() => toggleFavorite(file.id, "file")}>
        <StarIcon className="size-4 mr-2.5" /> Star
      </Item>
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setRenameTarget({ type: "file", id: file.id, name: file.originalName })}>
          <PencilIcon className="size-4 mr-2.5" /> Rename
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setShareFile(file)}>
          <Share2Icon className="size-4 mr-2.5" /> Share
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setMoveTarget({ type: "file", id: file.id })}>
          <ArrowRightIcon className="size-4 mr-2.5" /> Move to
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setClipboard({ ids: [file.id], action: "copy" })}>
          <CopyIcon className="size-4 mr-2.5" /> Copy
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setClipboard({ ids: [file.id], action: "cut" })}>
          <ScissorsIcon className="size-4 mr-2.5" /> Cut
        </Item>
      )}
      <Separator variant={variant} />
      <Item variant={variant} onSelect={() => useFileSystemStore.getState().setPropertiesTarget({ type: "file", id: file.id })}>
        <InfoIcon className="size-4 mr-2.5" /> Details
      </Item>
      <Separator variant={variant} />
      {!readonly && (
        <DeleteConfirmDialog
          title="Delete file"
          description={`Are you sure you want to delete "${file.originalName}"? This will move it to the recycle bin.`}
          confirmLabel="Delete"
          onConfirm={() => {
            useFileSystemStore.getState().removeFile(file.id);
            api.deleteFile(file.id).catch(console.error);
          }}
        >
          <Item variant={variant} className="text-destructive">
            <Trash2Icon className="size-4 mr-2.5" /> Delete
          </Item>
        </DeleteConfirmDialog>
      )}
    </>
  );
}

/** Consistent set of actions for a folder. */
export function FolderMenu({ folder, variant }: { folder: FolderItem; variant: MenuVariant }) {
  const readonly = useFileSystemStore((s) => s.userRole) === ROLES.CLIENTS;
  const { toggleFavorite } = useFavorites();
  return (
    <>
      <Item variant={variant} onSelect={() => useFileSystemStore.getState().setPropertiesTarget({ type: "folder", id: folder.id })}>
        <InfoIcon className="size-4 mr-2.5" /> Info
      </Item>
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setRenameTarget({ type: "folder", id: folder.id, name: folder.name })}>
          <PencilIcon className="size-4 mr-2.5" /> Rename
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setClipboard({ ids: [folder.id], action: "copy" })}>
          <CopyIcon className="size-4 mr-2.5" /> Copy
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setClipboard({ ids: [folder.id], action: "cut" })}>
          <ScissorsIcon className="size-4 mr-2.5" /> Cut
        </Item>
      )}
      {!readonly && (
        <Item variant={variant} onSelect={() => useFileSystemStore.getState().setMoveTarget({ type: "folder", id: folder.id })}>
          <ArrowRightIcon className="size-4 mr-2.5" /> Move to
        </Item>
      )}
      <Item variant={variant} onSelect={() => toggleFavorite(folder.id, "folder")}>
        <StarIcon className="size-4 mr-2.5" /> Star
      </Item>
      <Separator variant={variant} />
      {!readonly && (
        <DeleteConfirmDialog
          title="Delete folder"
          description={`Are you sure you want to delete folder "${folder.name}"? This will move it to the recycle bin.`}
          confirmLabel="Delete"
          onConfirm={() => {
            useFileSystemStore.getState().removeFolder(folder.id);
            api.deleteFolder(folder.id).catch(console.error);
          }}
        >
          <Item variant={variant} className="text-destructive">
            <Trash2Icon className="size-4 mr-2.5" /> Delete
          </Item>
        </DeleteConfirmDialog>
      )}
    </>
  );
}

function Separator({ variant }: { variant: MenuVariant }) {
  return isDropdown(variant) ? <DropdownMenuSeparator /> : <ContextMenuSeparator />;
}

/** Three-dot overflow button rendering the same drive actions. */
export function DriveOverflowMenu({ kind, item }: { kind: "file" | "folder"; item: FileItem | FolderItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="size-8 shrink-0 rounded-full p-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-accent"
        >
          <MoreHorizontalIcon className="size-4.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {kind === "file" ? (
          <FileMenu file={item as FileItem} variant="dropdown" />
        ) : (
          <FolderMenu folder={item as FolderItem} variant="dropdown" />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StarToggle({ starred, onToggle, className }: { starred: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle();
      }}
      className={cn(
        "rounded-full p-1.5 text-muted-foreground/50 transition-all hover:bg-accent hover:text-amber-500",
        starred && "text-amber-400",
        className
      )}
    >
      <StarIcon className={cn("size-4", starred && "fill-amber-400")} />
    </button>
  );
}