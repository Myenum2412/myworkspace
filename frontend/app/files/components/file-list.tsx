"use client";

import { useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { getFileIcon, getFileTypeColor } from "@/components/files/utils";
import { formatSize } from "@/lib/file-system/types";
import { cn } from "@/lib/utils";
import {
  FolderIcon,
  DownloadIcon,
  Trash2Icon,
  EyeIcon,
  PencilIcon,
  Share2Icon,
  MoreHorizontalIcon,
  StarIcon,
  LockIcon,
  CopyIcon,
  ArrowRightIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import * as api from "@/lib/file-system/api";

function ListThumbnail({ file }: { file: { id: string; mimeType: string; originalName: string } }) {
  const [error, setError] = useState(false);

  if (file.mimeType.startsWith("image/") && !error) {
    return (
      <img
        src={`/api/files/thumbnail/${file.id}?size=small`}
        alt={file.originalName}
        className="size-8 rounded object-cover shrink-0"
        loading="lazy"
        onError={() => setError(true)}
      />
    );
  }

  return <>{getFileIcon(file.mimeType)}</>;
}

export function FileList() {
  const {
    folders,
    files,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    setCurrentFolder,
    setPreviewFile,
    setPreviewPaneFile,
    previewPaneFile,
    setShareFile,
    setRenameTarget,
    setPropertiesTarget,
    setMoveTarget,
    breadcrumbs,
  } = useFileSystemStore();

  const allIds = [...folders.map((f) => f.id), ...files.map((f) => f.id)];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  if (allIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <FolderIcon className="size-16 text-muted-foreground/20" />
        <p className="text-sm">This folder is empty</p>
        <p className="text-xs">Upload files or create a folder to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="w-10 px-3 py-2.5">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => allSelected ? clearSelection() : selectAll()}
              />
            </th>
            <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider">Name</th>
            <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Type</th>
            <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden md:table-cell">Size</th>
            <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Owner</th>
            <th className="text-left px-3 py-2.5 font-medium text-xs text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Modified</th>
            <th className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {folders.map((folder) => (
            <tr
              key={folder.id}
              className={cn(
                "group hover:bg-muted/30 cursor-pointer transition-colors",
                selectedIds.has(folder.id) && "bg-primary/5",
              )}
              onDoubleClick={() => {
                setCurrentFolder(folder.id);
                useFileSystemStore.getState().setBreadcrumbs([
                  ...breadcrumbs,
                  { id: folder.id, name: folder.name },
                ]);
              }}
            >
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(folder.id)}
                  onCheckedChange={() => toggleSelection(folder.id)}
                />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <FolderIcon className="size-4 shrink-0 text-primary/60" />
                  <span className="font-medium truncate">{folder.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">Folder</td>
              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">—</td>
              <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">—</td>
              <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                {folder.createdAt ? new Date(folder.createdAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                      <MoreHorizontalIcon className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={() => setCurrentFolder(folder.id)}>
                      <FolderIcon className="size-3.5 mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRenameTarget({ type: "folder", id: folder.id, name: folder.name })}>
                      <PencilIcon className="size-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setMoveTarget({ type: "folder", id: folder.id })}>
                      <ArrowRightIcon className="size-3.5 mr-2" /> Move
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setPropertiesTarget({ type: "folder", id: folder.id })}>
                      <EyeIcon className="size-3.5 mr-2" /> Properties
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => {
                        if (confirm(`Delete folder "${folder.name}"?`)) {
                          useFileSystemStore.getState().removeFolder(folder.id);
                          api.deleteFolder(folder.id).catch(console.error);
                        }
                      }}
                    >
                      <Trash2Icon className="size-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
          {files.map((file) => (
            <tr
              key={file.id}
              className={cn(
                "group hover:bg-muted/30 cursor-pointer transition-colors",
                selectedIds.has(file.id) && "bg-primary/5",
                previewPaneFile?.id === file.id && "bg-blue-50/50 dark:bg-blue-950/20",
              )}
              onClick={() => setPreviewPaneFile(file)}
              onDoubleClick={() => setPreviewFile(file)}
            >
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(file.id)}
                  onCheckedChange={() => toggleSelection(file.id)}
                />
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <ListThumbnail file={file} />
                  <span className="font-medium truncate">{file.originalName}</span>
                  {file.isFavorite && <StarIcon className="size-3 fill-amber-400 text-amber-400 shrink-0" />}
                  {file.isLocked && <LockIcon className="size-3 text-muted-foreground shrink-0" />}
                </div>
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                {file.mimeType.split("/").pop()?.toUpperCase() || "FILE"}
              </td>
              <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">{formatSize(file.size)}</td>
              <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">{file.uploaderName || "—"}</td>
              <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : (file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "—")}
              </td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
                      <MoreHorizontalIcon className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onSelect={() => setPreviewFile(file)}>
                      <EyeIcon className="size-3.5 mr-2" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => window.open(`/api/files/${file.id}/download`, "_blank")}>
                      <DownloadIcon className="size-3.5 mr-2" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setShareFile(file)}>
                      <Share2Icon className="size-3.5 mr-2" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setRenameTarget({ type: "file", id: file.id, name: file.originalName })}>
                      <PencilIcon className="size-3.5 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => {
                      api.duplicateFile(file.id).catch(console.error);
                    }}>
                      <CopyIcon className="size-3.5 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setPropertiesTarget({ type: "file", id: file.id })}>
                      <EyeIcon className="size-3.5 mr-2" /> Properties
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onSelect={() => {
                        if (confirm(`Delete "${file.originalName}"?`)) {
                          useFileSystemStore.getState().removeFile(file.id);
                          api.deleteFile(file.id).catch(console.error);
                        }
                      }}
                    >
                      <Trash2Icon className="size-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
