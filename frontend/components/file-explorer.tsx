"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
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
  FolderOpenIcon, RotateCcwIcon, Building2Icon, UserPlusIcon, CheckCircle2Icon,
} from "lucide-react";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { DropZoneUpload } from "@/components/dropzone-upload";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { FileShareDialog } from "@/components/file-share-dialog";
import { getSocketIO } from "@/lib/socketio-client";

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
  clientId?: string | null;
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
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith("video/")) return <FileIcon className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith("audio/")) return <FileIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("pdf")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return <ArchiveIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith("text/")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  return <FileIcon className="size-5 text-muted-foreground" />;
}

interface FileExplorerProps {
  orgId: string;
  userId: string;
  /**
   * When set, the explorer is scoped to a single client — only folders and
   * files with that clientId are shown. Used by the per-client workspace
   * view inside the Client File Manager.
   */
  clientId?: string | null;
}

export function FileExplorer({ orgId, userId, clientId = null }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Files" }]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Upload
  const [showUpload, setShowUpload] = useState(false);

  // Dialogs
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareFile, setShareFile] = useState<FileItem | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [inlineRenamingId, setInlineRenamingId] = useState<string | null>(null);
  const [inlineRenameValue, setInlineRenameValue] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: "file" | "folder"; name: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Client folder auto-creation
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [creatingClientFolder, setCreatingClientFolder] = useState<string | null>(null);

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
      if (clientId) params.set("clientId", clientId);

      const foldersParams = new URLSearchParams({ orgId });
      if (currentFolderId) foldersParams.set("parentId", currentFolderId);
      else foldersParams.set("parentId", "");
      if (clientId) foldersParams.set("clientId", clientId);

      const [filesRes, foldersRes] = await Promise.all([
        fetch(`/api/files?${params}`, { credentials: "include" }),
        fetch(`/api/folders?${foldersParams}`, { credentials: "include" }),
      ]);

      const filesData = await filesRes.json();
      const foldersData = await foldersRes.json();

      setFiles(filesData.data || []);
      const fetchedFolders: FolderItem[] = foldersData.data || [];
      setFolders(fetchedFolders);

      // Resolve client names for folders grouped under a clientId.
      const clientIds = [...new Set(foldersData.data?.map((f: FolderItem) => f.clientId).filter(Boolean) || [])] as string[];
      if (clientIds.length > 0) {
        fetch(`/api/clients?ids=${encodeURIComponent(clientIds.join(","))}`, { credentials: "include" })
          .then((r) => r.json())
          .then((d) => {
            const list: Record<string, unknown>[] = Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
            const names: Record<string, string> = {};
            for (const c of list) names[String(c.id)] = String(c.name || c.id);
            setClientNames(names);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load files:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId, currentFolderId, search, sortBy, clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime refresh — backend emits `folder:*`, `file:*`, `client:*` to the
  // org room over socket.io. Use the app's shared socket client (cookie-aware
  // NextAuth bridge). A full refetch is simplest and safe: per-org data volume
  // is bounded, and it guarantees the grid + the per-client explorer stay
  // consistent after uploads performed in another view.
  useEffect(() => {
    let cancelled = false;
    const refresh = () => { if (!cancelled) fetchData(); };
    let sock: ReturnType<typeof getSocketIO> | null = null;
    try {
      sock = getSocketIO();
      sock.on("folder:created", refresh);
      sock.on("folder:updated", refresh);
      sock.on("folder:deleted", refresh);
      sock.on("file:uploaded", refresh);
      sock.on("file:updated", refresh);
      sock.on("file:deleted", refresh);
      sock.on("client:created", refresh);
    } catch {}
    return () => {
      cancelled = true;
      if (sock) {
        sock.off("folder:created", refresh);
        sock.off("folder:updated", refresh);
        sock.off("folder:deleted", refresh);
        sock.off("file:uploaded", refresh);
        sock.off("file:updated", refresh);
        sock.off("file:deleted", refresh);
        sock.off("client:created", refresh);
      }
    };
  }, [fetchData]);

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
        credentials: "include",
        body: JSON.stringify({ orgId, parentId: currentFolderId, name: newFolderName.trim() }),
      });
      if (res.ok) {
        setNewFolderName("");
        setShowNewFolder(false);
        fetchData();
      }
    } catch {}
  };

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" });
      const d = await res.json();
      const arr: Record<string, unknown>[] = Array.isArray(d) ? d : (d.data || []);
      setClients(arr.map((c) => ({ id: String(c.id), name: String(c.name || c.id) })));
    } catch {}
  }, []);

  const createClientFolder = async (clientId: string, clientName: string) => {
    if (!clientId || currentFolderId !== null) return; // only at root
    setCreatingClientFolder(clientId);
    try {
      // Create a top-level folder named after the client. Subfolders mirror
      // the workspace provision template.
      const subfolders = ["Documents", "Reports", "Projects", "Settings"];
      const clientFolderRes = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, parentId: null, name: clientName, clientId }),
      });
      if (!clientFolderRes.ok) {
        setCreatingClientFolder(null);
        setClientPickerOpen(false);
        return;
      }
      const { folderId: clientFolderId } = await clientFolderRes.json();
      for (const sub of subfolders) {
        await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ orgId, parentId: clientFolderId, name: sub, clientId }),
        });
      }
      setClientPickerOpen(false);
      fetchData();
    } catch {}
    setCreatingClientFolder(null);
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
        credentials: "include",
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameValue("");
        setInlineRenamingId(null);
        setInlineRenameValue("");
        fetchData();
      }
    } catch {}
  };

  const deleteItem = async (id: string, type: "file" | "folder") => {
    try {
      const endpoint = type === "file" ? `/api/files/${id}` : `/api/folders/${id}`;
      const res = await fetch(endpoint, { method: "DELETE", credentials: "include" });
      setConfirmDelete(null);
      if (res.ok) {
        setToastMessage(type === "file" ? "File moved to trash" : "Folder moved to trash");
        fetchData();
      } else {
        const data = await res.json().catch(() => ({}));
        setToastMessage(data.error || `Delete failed (${res.status})`);
      }
    } catch {
      setConfirmDelete(null);
      setToastMessage("Network error — delete failed");
    }
  };

  const confirmDeleteItem = (id: string, type: "file" | "folder", name: string) => {
    setConfirmDelete({ id, type, name });
  };

  const duplicateFile = async (fileId: string) => {
    try {
      await fetch(`/api/files/${fileId}/duplicate`, {
        method: "POST", credentials: "include",
      });
      fetchData();
    } catch {}
  };

  const toggleLock = async (fileId: string, locked: boolean) => {
    try {
      const action = locked ? "unlock" : "lock";
      await fetch(`/api/files/${fileId}/${action}`, {
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
        credentials: "include",
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

  const startInlineRename = (id: string, currentName: string) => {
    setInlineRenamingId(id);
    setInlineRenameValue(currentName);
  };

  const submitInlineRename = (id: string) => {
    if (!inlineRenameValue.trim()) return;
    const type = files.find(f => f.id === id) ? "file" : "folder";
    renameItem(id, type);
    setInlineRenamingId(null);
    setInlineRenameValue("");
  };

  const fileTypeCount = (type: string) =>
    files.filter(f => f.mimeType?.startsWith(type)).length;

  const displayFolders = folders;
  const displayFiles = files;

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div className={showUpload ? "block" : "hidden"}>
        <DropZoneUpload
          orgId={orgId}
          folderId={currentFolderId}
          clientId={clientId}
          onUploadComplete={fetchData}
          maxConcurrency={3}
        />
      </div>

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
        <Popover open={clientPickerOpen} onOpenChange={(o) => { setClientPickerOpen(o); if (o && clients.length === 0) fetchClients(); }}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Building2Icon className="mr-1 size-4" /> New Client Folder
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Pick a client</p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {clients.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-2">No clients yet.</p>
              )}
              {clients.map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted text-left disabled:opacity-50"
                  disabled={creatingClientFolder === c.id}
                  onClick={() => createClientFolder(c.id, c.name)}
                >
                  {creatingClientFolder === c.id
                    ? <Loader2Icon className="size-3 animate-spin" />
                    : <UserPlusIcon className="size-3 text-muted-foreground" />}
                  {c.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" onClick={() => setShowUpload((v) => !v)} variant={showUpload ? "secondary" : "default"}>
          <UploadIcon className="mr-1 size-4" /> {showUpload ? "Close Upload" : "Upload"}
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
      ) : viewMode === "grid" ? (
        <div className="space-y-6">
          {/* Folders */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayFolders.map((folder) => (
              <Card key={folder.id} className="group cursor-pointer hover:border-primary/50 transition-colors relative">
                <CardContent className="p-3" onClick={() => navigateToFolder(folder.id, folder.name)}>
                  <div className="flex flex-col items-center gap-2 py-2">
                    <FolderIcon className="size-10 text-muted-foreground" />
                    {inlineRenamingId === folder.id ? (
                      <Input
                        value={inlineRenameValue}
                        onChange={e => setInlineRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { e.stopPropagation(); submitInlineRename(folder.id); }
                          if (e.key === "Escape") { e.stopPropagation(); setInlineRenamingId(null); }
                        }}
                        onBlur={() => submitInlineRename(folder.id)}
                        onClick={e => e.stopPropagation()}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      <p
                        className="text-xs font-medium text-center truncate w-full"
                        onDoubleClick={e => { e.stopPropagation(); startInlineRename(folder.id, folder.name); }}
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
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startRename(folder.id, folder.name); }}>
                      <PencilIcon className="mr-2 size-4" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); confirmDeleteItem(folder.id, "folder", folder.name); }} className="text-destructive">
                      <Trash2Icon className="mr-2 size-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>
            ))}
          </div>
          {/* Files */}
          {displayFiles.map((file) => (
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
                <div className="flex flex-col items-center gap-2 py-2" onClick={() => { if (inlineRenamingId !== file.id) { setPreviewFile(file); setPreviewOpen(true); } }}>
                  {getFileIcon(file.mimeType)}
                  {inlineRenamingId === file.id ? (
                    <Input
                      value={inlineRenameValue}
                      onChange={e => setInlineRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") { e.stopPropagation(); submitInlineRename(file.id); }
                        if (e.key === "Escape") { e.stopPropagation(); setInlineRenamingId(null); }
                      }}
                      onBlur={() => submitInlineRename(file.id)}
                      onClick={e => e.stopPropagation()}
                      className="h-6 text-xs"
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-xs font-medium text-center truncate w-full"
                      onDoubleClick={e => { e.stopPropagation(); startInlineRename(file.id, file.originalName); }}
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
                    <DropdownMenuItem onClick={() => confirmDeleteItem(file.id, "file", file.originalName)} className="text-destructive">
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
              {displayFolders.map((folder) => (
                <tr key={folder.id} className="border-b last:border-0 hover:bg-blue-50/50 cursor-pointer" onClick={() => { if (inlineRenamingId !== folder.id) navigateToFolder(folder.id, folder.name); }}>
                  <td className="p-2"><FolderIcon className="size-4 text-muted-foreground" /></td>
                  <td className="p-2 text-sm font-medium" onDoubleClick={() => startInlineRename(folder.id, folder.name)}>
                    {inlineRenamingId === folder.id ? (
                      <Input
                        value={inlineRenameValue}
                        onChange={e => setInlineRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") { e.stopPropagation(); submitInlineRename(folder.id); }
                          if (e.key === "Escape") { e.stopPropagation(); setInlineRenamingId(null); }
                        }}
                        onBlur={() => submitInlineRename(folder.id)}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      folder.name
                    )}
                  </td>
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
                        <DropdownMenuItem onClick={() => confirmDeleteItem(folder.id, "folder", folder.name)} className="text-destructive"><Trash2Icon className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {displayFiles.map((file) => (
                <tr key={file.id} className="border-b last:border-0 hover:bg-blue-50/50">
                  <td className="p-2">
                    <input type="checkbox" checked={selectedIds.has(file.id)} onChange={() => toggleSelect(file.id)} className="size-4" />
                  </td>
                  <td className="p-2 text-sm cursor-pointer" onClick={() => { if (inlineRenamingId !== file.id) { setPreviewFile(file); setPreviewOpen(true); } }}>
                    <span className="flex items-center gap-2" onDoubleClick={() => startInlineRename(file.id, file.originalName)}>
                      {getFileIcon(file.mimeType)}
                      {inlineRenamingId === file.id ? (
                        <Input
                          value={inlineRenameValue}
                          onChange={e => setInlineRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.stopPropagation(); submitInlineRename(file.id); }
                            if (e.key === "Escape") { e.stopPropagation(); setInlineRenamingId(null); }
                          }}
                          onBlur={() => submitInlineRename(file.id)}
                          className="h-6 text-xs"
                          autoFocus
                        />
                      ) : (
                        <span className="truncate max-w-[200px]">{file.originalName}</span>
                      )}
                      {file.isLocked && <LockIcon className="size-3 text-muted-foreground shrink-0" />}
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
                        <DropdownMenuItem onClick={() => confirmDeleteItem(file.id, "file", file.originalName)} className="text-destructive"><Trash2Icon className="mr-2 size-4" /> Delete</DropdownMenuItem>
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

      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="bg-background rounded-lg p-5 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Confirm Delete</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {confirmDelete.type === "folder"
                ? "The folder and all its contents will be moved to trash."
                : "The file will be moved to trash."}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={() => deleteItem(confirmDelete.id, confirmDelete.type)}>
                <Trash2Icon className="mr-1 size-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2Icon className="size-4" />
          {toastMessage}
        </div>
      )}

      {/* Dialogs */}
      <FilePreviewDialog
        file={previewFile}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        orgId={orgId}
        onDelete={(id) => { setPreviewOpen(false); const f = files.find(fi => fi.id === id); confirmDeleteItem(id, "file", f?.originalName || id); }}
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
