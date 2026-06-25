"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderIcon, FileIcon, UploadIcon, SearchIcon, Grid3X3Icon, ListIcon,
  MoreHorizontalIcon, DownloadIcon, Trash2Icon, PencilIcon, CopyIcon,
  MoveIcon, Share2Icon, LockIcon, UnlockIcon, HistoryIcon,
  ChevronRightIcon, ChevronDownIcon, PlusIcon, ArrowUpIcon,
  Loader2Icon, AlertCircleIcon, ImageIcon, FileTextIcon, ArchiveIcon,
  FolderOpenIcon, RotateCcwIcon,
} from "lucide-react";
import { FileUploadDialog } from "@/components/file-upload-dialog";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { FileShareDialog } from "@/components/file-share-dialog";

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  tags?: string[];
  isLocked?: boolean;
  lockedBy?: string | null;
  currentVersion?: number;
  uploaderName?: string;
  uploaderId?: string;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
  category?: string;
};

type FolderItem = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children?: FolderItem[];
};

type ViewMode = "grid" | "list";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-5 text-red-500" />;
  if (mimeType.startsWith("video/")) return <FileIcon className="size-5 text-red-500" />;
  if (mimeType.startsWith("audio/")) return <FileIcon className="size-5 text-red-500" />;
  if (mimeType.includes("pdf")) return <FileTextIcon className="size-5 text-red-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return <ArchiveIcon className="size-5 text-orange-400" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileTextIcon className="size-5 text-red-500" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileTextIcon className="size-5 text-gray-700" />;
  if (mimeType.startsWith("text/")) return <FileTextIcon className="size-5 text-slate-600" />;
  return <FileIcon className="size-5 text-muted-foreground" />;
}

interface FileExplorerProps {
  orgId: string;
  userId: string;
}

export function FileExplorer({ orgId, userId }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Files" }]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Sort
  const [sortBy, setSortBy] = useState<string>("-createdAt");

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ orgId });
      if (currentFolderId) params.set("folderId", currentFolderId);
      if (search) params.set("search", search);
      params.set("sort", sortBy);

      const [filesRes, foldersRes] = await Promise.all([
        fetch(`/api/files?${params}`, { credentials: "include" }),
        fetch(`/api/folders?orgId=${orgId}&parentId=${currentFolderId || ""}`, { credentials: "include" }),
      ]);

      const filesData = await filesRes.json();
      const foldersData = await foldersRes.json();

      setFiles(filesData.data || []);
      setFolders(foldersData.data || []);
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, currentFolderId, search, sortBy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const navigateToFolder = useCallback(async (folderId: string | null, folderName?: string) => {
    setCurrentFolderId(folderId);
    if (folderId && folderName) {
      setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    } else if (!folderId) {
      setBreadcrumbs([{ id: null, name: "Files" }]);
    }
    setSelectedIds(new Set());
  }, []);

  const navigateToBreadcrumb = useCallback(async (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setSelectedIds(new Set());
  }, [breadcrumbs]);

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, parentId: currentFolderId, name: newFolderName.trim() }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolder(false);
        fetchData();
      }
    } catch {}
  };

  const renameItem = async (id: string, type: "file" | "folder") => {
    if (!renameValue.trim()) return;
    try {
      const endpoint = type === "file"
        ? `/api/files/${id}`
        : `/api/folders/${id}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameValue("");
        fetchData();
      }
    } catch {}
  };

  const deleteItem = async (id: string, type: "file" | "folder") => {
    try {
      const endpoint = type === "file" ? `/api/files/${id}` : `/api/folders/${id}`;
      await fetch(endpoint, { method: "DELETE" });
      fetchData();
    } catch {}
  };

  const duplicateFile = async (fileId: string) => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/files/${fileId}/duplicate`, {
        method: "POST", credentials: "include",
      });
      fetchData();
    } catch {}
  };

  const toggleLock = async (fileId: string, locked: boolean) => {
    try {
      const action = locked ? "unlock" : "lock";
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/files/${fileId}/${action}`, {
        method: "POST", credentials: "include",
      });
      fetchData();
    } catch {}
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === files.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(files.map(f => f.id)));
  };

  const doBulkDelete = async () => {
    try {
      await fetch("/api/files/bulk-delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: Array.from(selectedIds) }),
      });
      setSelectedIds(new Set());
      fetchData();
    } catch {}
  };

  const handleDownload = (fileId: string) => {
    window.open(`/api/files/${fileId}?download=true`, "_blank");
  };

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const fileTypeCount = (type: string) =>
    files.filter(f => f.mimeType?.startsWith(type)).length;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => navigateToFolder(null)} disabled={!currentFolderId}>
          <ArrowUpIcon className="size-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowNewFolder(!showNewFolder)}>
          <PlusIcon className="mr-1 size-4" /> Folder
        </Button>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <UploadIcon className="mr-1 size-4" /> Upload
        </Button>
        <div className="flex border rounded-md">
          <button
            className={`p-2 ${viewMode === "grid" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("grid")}
          ><Grid3X3Icon className="size-4" /></button>
          <button
            className={`p-2 ${viewMode === "list" ? "bg-muted" : ""}`}
            onClick={() => setViewMode("list")}
          ><ListIcon className="size-4" /></button>
        </div>
        <select
          className="text-sm border rounded-md px-2 py-1"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="-createdAt">Newest</option>
          <option value="createdAt">Oldest</option>
          <option value="name">Name A-Z</option>
          <option value="-name">Name Z-A</option>
          <option value="-size">Largest</option>
          <option value="size">Smallest</option>
        </select>
      </div>

      {/* New Folder Input */}
      {showNewFolder && (
        <div className="flex items-center gap-2 p-2 border rounded-md">
          <FolderIcon className="size-5 text-muted-foreground" />
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={e => setNewFolderName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createFolder()}
            className="flex-1"
            autoFocus
          />
          <Button size="sm" onClick={createFolder}>Create</Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>Cancel</Button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.id || "root"} className="flex items-center gap-1">
            {index > 0 && <ChevronRightIcon className="size-3 text-muted-foreground" />}
            <button
              className={`hover:underline ${index === breadcrumbs.length - 1 ? "font-medium" : "text-muted-foreground"}`}
              onClick={() => navigateToBreadcrumb(index)}
            >
              {index === 0 ? <><FolderOpenIcon className="inline size-3 mr-1" />{crumb.name}</> : crumb.name}
            </button>
          </span>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{files.length} file{files.length !== 1 ? "s" : ""}</span>
        <span>{folders.length} folder{folders.length !== 1 ? "s" : ""}</span>
        {fileTypeCount("image/") > 0 && <Badge variant="outline" className="text-xs">{fileTypeCount("image/")} images</Badge>}
        {fileTypeCount("video/") > 0 && <Badge variant="outline" className="text-xs">{fileTypeCount("video/")} videos</Badge>}
        {fileTypeCount("audio/") > 0 && <Badge variant="outline" className="text-xs">{fileTypeCount("audio/")} audio</Badge>}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={doBulkDelete}>
            <Trash2Icon className="mr-1 size-4" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpenIcon className="size-16 mb-3" />
          <p className="text-lg font-medium">This folder is empty</p>
          <p className="text-sm mb-4">Upload files or create a folder to get started</p>
          <div className="flex gap-2">
            <Button onClick={() => setShowNewFolder(true)} variant="outline">
              <PlusIcon className="mr-1 size-4" /> New Folder
            </Button>
            <Button onClick={() => setUploadOpen(true)}>
              <UploadIcon className="mr-1 size-4" /> Upload Files
            </Button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {/* Folders */}
          {folders.map((folder) => (
            <Card key={folder.id} className="group cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-3" onClick={() => navigateToFolder(folder.id, folder.name)}>
                <div className="flex flex-col items-center gap-2 py-2">
                  <FolderIcon className="size-10 text-orange-400" />
                  <p className="text-xs font-medium text-center truncate w-full">{folder.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Files */}
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
                    onChange={() => toggleSelect(file.id)}
                    className="size-4 opacity-0 group-hover:opacity-100 checked:opacity-100"
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="flex flex-col items-center gap-2 py-2" onClick={() => { setPreviewFile(file); setPreviewOpen(true); }}>
                  {getFileIcon(file.mimeType)}
                  <p className="text-xs font-medium text-center truncate w-full">{file.originalName}</p>
                  <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
                  {file.isLocked && <LockIcon className="size-3 text-orange-400" />}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 size-6 opacity-0 group-hover:opacity-100">
                      <MoreHorizontalIcon className="size-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => { setPreviewFile(file); setPreviewOpen(true); }}>
                      <FileTextIcon className="mr-2 size-4" /> Preview
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(file.id)}>
                      <DownloadIcon className="mr-2 size-4" /> Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => startRename(file.id, file.originalName)}>
                      <PencilIcon className="mr-2 size-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => duplicateFile(file.id)}>
                      <CopyIcon className="mr-2 size-4" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setShareFile(file); setShareOpen(true); }}>
                      <Share2Icon className="mr-2 size-4" /> Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => toggleLock(file.id, !!file.isLocked)}>
                      {file.isLocked ? <><UnlockIcon className="mr-2 size-4" /> Unlock</> : <><LockIcon className="mr-2 size-4" /> Lock</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteItem(file.id, "file")} className="text-destructive">
                      <Trash2Icon className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="border rounded-md">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr className="border-b text-xs text-muted-foreground">
                <th className="p-2 text-left w-8">
                  <input type="checkbox" checked={selectedIds.size === files.length && files.length > 0} onChange={selectAll} className="size-4" />
                </th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left hidden sm:table-cell">Type</th>
                <th className="p-2 text-left hidden md:table-cell">Owner</th>
                <th className="p-2 text-right">Size</th>
                <th className="p-2 text-right hidden lg:table-cell">Modified</th>
                <th className="p-2 text-right w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {folders.map((folder) => (
                <tr key={folder.id} className="border-b last:border-0 hover:bg-blue-50/50 cursor-pointer" onClick={() => navigateToFolder(folder.id, folder.name)}>
                  <td className="p-2"><FolderIcon className="size-4 text-orange-400" /></td>
                  <td className="p-2 text-sm font-medium">{folder.name}</td>
                  <td className="p-2 text-xs text-muted-foreground hidden sm:table-cell">Folder</td>
                  <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">—</td>
                  <td className="p-2 text-xs text-muted-foreground text-right">—</td>
                  <td className="p-2 text-xs text-muted-foreground text-right hidden lg:table-cell">—</td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="size-6"><MoreHorizontalIcon className="size-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => startRename(folder.id, folder.name)}><PencilIcon className="mr-2 size-4" /> Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteItem(folder.id, "folder")} className="text-destructive"><Trash2Icon className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {files.map((file) => (
                <tr key={file.id} className="border-b last:border-0 hover:bg-blue-50/50">
                  <td className="p-2">
                    <input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} className="size-4" />
                  </td>
                  <td className="p-2 text-sm cursor-pointer" onClick={() => { setPreviewFile(file); setPreviewOpen(true); }}>
                    <span className="flex items-center gap-2">
                      {getFileIcon(file.mimeType)}
                      <span className="truncate max-w-[200px]">{file.originalName}</span>
                      {file.isLocked && <LockIcon className="size-3 text-orange-400 shrink-0" />}
                    </span>
                  </td>
                  <td className="p-2 text-xs text-muted-foreground hidden sm:table-cell">{file.mimeType.split("/")[1]?.toUpperCase() || file.mimeType}</td>
                  <td className="p-2 text-xs text-muted-foreground hidden md:table-cell">{file.uploaderName || "Unknown"}</td>
                  <td className="p-2 text-xs text-muted-foreground text-right">{formatSize(file.size)}</td>
                  <td className="p-2 text-xs text-muted-foreground text-right hidden lg:table-cell">
                    {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : ""}
                  </td>
                  <td className="p-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="size-6"><MoreHorizontalIcon className="size-3" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => { setPreviewFile(file); setPreviewOpen(true); }}><FileTextIcon className="mr-2 size-4" /> Preview</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(file.id)}><DownloadIcon className="mr-2 size-4" /> Download</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => startRename(file.id, file.originalName)}><PencilIcon className="mr-2 size-4" /> Rename</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateFile(file.id)}><CopyIcon className="mr-2 size-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setShareFile(file); setShareOpen(true); }}><Share2Icon className="mr-2 size-4" /> Share</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => deleteItem(file.id, "file")} className="text-destructive"><Trash2Icon className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Rename dialog inline */}
      {renamingId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setRenamingId(null)}>
          <div className="bg-background rounded-lg p-4 w-80" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-medium mb-2">Rename</h3>
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => {
              if (e.key === "Enter") renameItem(renamingId, files.find(f => f.id === renamingId) ? "file" : "folder");
              if (e.key === "Escape") setRenamingId(null);
            }} autoFocus />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={() => setRenamingId(null)}>Cancel</Button>
              <Button size="sm" onClick={() => renameItem(renamingId, files.find(f => f.id === renamingId) ? "file" : "folder")}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <FileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        orgId={orgId}
        folderId={currentFolderId}
        onUploadComplete={fetchData}
      />

      <FilePreviewDialog
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        orgId={orgId}
        onDelete={(id) => { setPreviewOpen(false); deleteItem(id, "file"); }}
        onDuplicate={(id) => { setPreviewOpen(false); duplicateFile(id); }}
        onLockToggle={(id, locked) => toggleLock(id, locked)}
        onShare={(file) => { setPreviewOpen(false); setShareFile(file); setShareOpen(true); }}
      />

      {shareFile && (
        <FileShareDialog
          key={shareFile.id}
          open={shareOpen}
          onOpenChange={setShareOpen}
          fileId={shareFile.id}
          orgId={orgId}
        />
      )}
    </div>
  );
}
