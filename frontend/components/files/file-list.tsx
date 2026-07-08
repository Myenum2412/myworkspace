"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderIcon, Loader2Icon, LockIcon, MoreHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { FileItem, FolderItem, ViewMode, formatSize } from "./types";
import { getFileIcon } from "./utils";
import { FileContextMenu } from "./file-context-menu";

interface FileListProps {
  loading: boolean;
  viewMode: ViewMode;
  folders: FolderItem[];
  files: FileItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onNavigateToFolder: (folderId: string, folderName: string) => void;
  onPreviewFile: (file: FileItem) => void;
  onDownloadFile: (fileId: string) => void;
  onDuplicateFile: (fileId: string) => void;
  onShareFile: (file: FileItem) => void;
  onToggleLock: (fileId: string, locked: boolean) => void;
  onConfirmDelete: (id: string, type: "file" | "folder", name: string) => void;
  onFolderProperties: (folderId: string) => void;
  onRenameStart: (id: string, currentName: string) => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
  inlineRenamingId: string | null;
  inlineRenameValue: string;
  onInlineRenameChange: (value: string) => void;
  onStartInlineRename: (id: string, currentName: string) => void;
  onSubmitInlineRename: (id: string) => void;
  onCancelInlineRename: () => void;
}

function fileTypeCount(files: FileItem[], type: string) {
  return files.filter(f => f.mimeType?.startsWith(type)).length;
}

export function FileList({
  loading, viewMode, folders, files, selectedIds,
  onToggleSelect, onSelectAll, onNavigateToFolder,
  onPreviewFile, onDownloadFile, onDuplicateFile, onShareFile,
  onToggleLock, onConfirmDelete, onFolderProperties, onRenameStart,
  onBulkDelete, onClearSelection,
  inlineRenamingId, inlineRenameValue, onInlineRenameChange,
  onStartInlineRename, onSubmitInlineRename, onCancelInlineRename,
}: FileListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
        <span>{folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
        {fileTypeCount(files, "image/") > 0 && <Badge variant="outline" className="text-xs">{fileTypeCount(files, "image/")} images</Badge>}
        {fileTypeCount(files, "video/") > 0 && <Badge variant="outline" className="text-xs">{fileTypeCount(files, "video/")} videos</Badge>}
        {fileTypeCount(files, "audio/") > 0 && <Badge variant="outline" className="text-xs">{fileTypeCount(files, "audio/")} audio</Badge>}
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={onBulkDelete}>
            <Trash2Icon className="mr-1 size-4" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <Card key={folder.id} className="group cursor-pointer hover:border-primary/50 transition-colors relative">
                <CardContent className="p-3" onClick={() => onNavigateToFolder(folder.id, folder.name)}>
                  <div className="flex flex-col items-center gap-2 py-2">
                    <FolderIcon className="size-10 text-muted-foreground" />
                    {inlineRenamingId === folder.id ? (
                      <Input
                        value={inlineRenameValue}
                        onChange={e => onInlineRenameChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { e.stopPropagation(); onSubmitInlineRename(folder.id); }
                          if (e.key === "Escape") { e.stopPropagation(); onCancelInlineRename(); }
                        }}
                        onBlur={() => onSubmitInlineRename(folder.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      <p
                        className="text-xs font-medium text-center truncate w-full"
                        onDoubleClick={e => { e.stopPropagation(); onStartInlineRename(folder.id, folder.name); }}
                      >
                        {folder.name}
                      </p>
                    )}
                  </div>
                </CardContent>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100">
                      <MoreHorizontalIcon className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <FileContextMenu
                    type="folder"
                    onRename={() => onRenameStart(folder.id, folder.name)}
                    onProperties={() => onFolderProperties(folder.id)}
                    onDelete={() => onConfirmDelete(folder.id, "folder", folder.name)}
                  />
                </DropdownMenu>
              </Card>
            ))}
          </div>
          {files.map((file) => (
            <Card
              key={file.id}
              className={`group cursor-pointer hover:border-primary/50 transition-colors relative ${
                selectedIds.has(file.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="p-3">
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(file.id)}
                    onChange={() => onToggleSelect(file.id)}
                    className="size-4 opacity-0 group-hover:opacity-100 checked:opacity-100"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="flex flex-col items-center gap-2 py-2" onClick={() => { if (inlineRenamingId !== file.id) { onPreviewFile(file); } }}>
                  {getFileIcon(file.mimeType)}
                  {inlineRenamingId === file.id ? (
                    <Input
                      value={inlineRenameValue}
                      onChange={e => onInlineRenameChange(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.stopPropagation(); onSubmitInlineRename(file.id); }
                        if (e.key === "Escape") { e.stopPropagation(); onCancelInlineRename(); }
                      }}
                      onBlur={() => onSubmitInlineRename(file.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-6 text-xs"
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-xs font-medium text-center truncate w-full"
                      onDoubleClick={e => { e.stopPropagation(); onStartInlineRename(file.id, file.originalName); }}
                    >
                      {file.originalName}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
                  {file.isLocked && <LockIcon className="size-3 text-muted-foreground" />}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100">
                      <MoreHorizontalIcon className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <FileContextMenu
                    type="file"
                    isLocked={file.isLocked}
                    onPreview={() => onPreviewFile(file)}
                    onDownload={() => onDownloadFile(file.id)}
                    onRename={() => onRenameStart(file.id, file.originalName)}
                    onDuplicate={() => onDuplicateFile(file.id)}
                    onShare={() => onShareFile(file)}
                    onToggleLock={() => onToggleLock(file.id, !!file.isLocked)}
                    onDelete={() => onConfirmDelete(file.id, "file", file.originalName)}
                  />
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border border-gray-200 bg-white shadow-sm overflow-x-auto rounded-md">
          <table className="table w-full text-sm text-left">
            <thead className="bg-[#f3f4f6]">
              <tr className="border-b text-left text-sm text-gray-900 font-semibold">
                <th className="px-4 py-3.5 text-left w-8 font-semibold">
                  <input type="checkbox" checked={selectedIds.size === files.length && files.length > 0} onChange={onSelectAll} className="size-4" />
                </th>
                <th className="px-4 py-3.5 text-left font-semibold">Name</th>
                <th className="px-4 py-3.5 text-left font-semibold hidden sm:table-cell">Type</th>
                <th className="px-4 py-3.5 text-left font-semibold hidden md:table-cell">Owner</th>
                <th className="px-4 py-3.5 text-right font-semibold">Size</th>
                <th className="px-4 py-3.5 text-right font-semibold hidden lg:table-cell">Modified</th>
                <th className="px-4 py-3.5 text-right font-semibold w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={folder.id} className="border-b last:border-0 hover:bg-slate-50 bg-white cursor-pointer" onClick={() => { if (inlineRenamingId !== folder.id) onNavigateToFolder(folder.id, folder.name); }}>
                  <td className="px-4 py-3"><FolderIcon className="size-4 text-muted-foreground" /></td>
                  <td className="px-4 py-3 text-sm font-medium" onDoubleClick={() => onStartInlineRename(folder.id, folder.name)}>
                    {inlineRenamingId === folder.id ? (
                      <Input
                        value={inlineRenameValue}
                        onChange={e => onInlineRenameChange(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { e.stopPropagation(); onSubmitInlineRename(folder.id); }
                          if (e.key === "Escape") { e.stopPropagation(); onCancelInlineRename(); }
                        }}
                        onBlur={() => onSubmitInlineRename(folder.id)}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      folder.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">Folder</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">—</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right">—</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden lg:table-cell">—</td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="size-6"><MoreHorizontalIcon className="size-3" /></Button>
                      </DropdownMenuTrigger>
                      <FileContextMenu
                        type="folder"
                        onRename={() => onRenameStart(folder.id, folder.name)}
                        onProperties={() => onFolderProperties(folder.id)}
                        onDelete={() => onConfirmDelete(folder.id, "folder", folder.name)}
                      />
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {files.map((file) => (
                <tr key={file.id} className="border-b last:border-0 hover:bg-slate-50 bg-white">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => onToggleSelect(file.id)} className="size-4" />
                  </td>
                  <td className="px-4 py-3 text-sm cursor-pointer" onClick={() => { if (inlineRenamingId !== file.id) { onPreviewFile(file); } }}>
                    <span className="flex items-center gap-2" onDoubleClick={() => onStartInlineRename(file.id, file.originalName)}>
                      {getFileIcon(file.mimeType)}
                      {inlineRenamingId === file.id ? (
                        <Input
                          value={inlineRenameValue}
                          onChange={e => onInlineRenameChange(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.stopPropagation(); onSubmitInlineRename(file.id); }
                            if (e.key === "Escape") { e.stopPropagation(); onCancelInlineRename(); }
                          }}
                          onBlur={() => onSubmitInlineRename(file.id)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate max-w-[200px]">{file.originalName}</span>
                      )}
                      {file.isLocked && <LockIcon className="size-3 text-muted-foreground shrink-0" />}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{file.mimeType.split("/")[1]?.toUpperCase() || file.mimeType}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{file.uploaderName || "Unknown"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right">{formatSize(file.size)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden lg:table-cell">
                    {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-6"><MoreHorizontalIcon className="size-3" /></Button>
                      </DropdownMenuTrigger>
                      <FileContextMenu
                        type="file"
                        isLocked={file.isLocked}
                        onPreview={() => onPreviewFile(file)}
                        onDownload={() => onDownloadFile(file.id)}
                        onRename={() => onRenameStart(file.id, file.originalName)}
                        onDuplicate={() => onDuplicateFile(file.id)}
                        onShare={() => onShareFile(file)}
                        onToggleLock={() => onToggleLock(file.id, !!file.isLocked)}
                        onDelete={() => onConfirmDelete(file.id, "file", file.originalName)}
                      />
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
