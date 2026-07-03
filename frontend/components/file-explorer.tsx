"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Loader2Icon, CheckCircle2Icon, Trash2Icon,
} from "lucide-react";
import { DropZoneUpload } from "@/components/dropzone-upload";
import { FilePreviewDialog } from "@/components/file-preview-dialog";
import { FileShareDialog } from "@/components/file-share-dialog";
import { getSocketIO } from "@/lib/socketio-client";
import { FileItem, FolderItem, ViewMode, formatSize } from "./files/types";
import { FileBreadcrumb } from "./files/file-breadcrumb";
import { FileToolbar } from "./files/file-toolbar";
import { FileList } from "./files/file-list";

interface FileExplorerProps {
  orgId: string;
  userId: string;
  clientId?: string | null;
}

export function FileExplorer({ orgId, userId, clientId = null }: FileExplorerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([{ id: null, name: "Files" }]);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [showUpload, setShowUpload] = useState(false);

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

  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesData, setPropertiesData] = useState<{
    name: string;
    path: string;
    createdAt: string;
    createdBy?: string;
    fileCount: number;
    totalSize: number;
  } | null>(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  const [sortBy, setSortBy] = useState<string>("-createdAt");

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

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
      toast.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [orgId, currentFolderId, search, sortBy, clientId]);

  const [clientNames, setClientNames] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const openFolderProperties = async (folderId: string) => {
    setPropertiesOpen(true);
    setPropertiesLoading(true);
    try {
      const [folderRes, filesRes] = await Promise.all([
        fetch(`/api/folders/${folderId}`, { credentials: "include" }),
        fetch(`/api/files?orgId=${encodeURIComponent(orgId)}&folderId=${encodeURIComponent(folderId)}`, { credentials: "include" }),
      ]);
      const folderData = await folderRes.json();
      const filesData = await filesRes.json();
      const folder = folderData.data || {};
      const fileList: FileItem[] = filesData.data || [];
      const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);
      setPropertiesData({
        name: folder.name || "",
        path: folder.path || "",
        createdAt: folder.createdAt || "",
        createdBy: folder.createdBy || "",
        fileCount: fileList.length,
        totalSize,
      });
    } catch {
      setPropertiesData(null);
    } finally {
      setPropertiesLoading(false);
    }
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

  return (
    <div className="space-y-4">
      <div className={showUpload ? "block" : "hidden"}>
        <DropZoneUpload
          orgId={orgId}
          folderId={currentFolderId}
          clientId={clientId}
          onUploadComplete={fetchData}
          maxConcurrency={3}
        />
      </div>

      <FileToolbar
        search={search}
        onSearchChange={setSearch}
        currentFolderId={currentFolderId}
        onNavigateUp={() => navigateToFolder(null)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        showUpload={showUpload}
        onToggleUpload={() => setShowUpload((v) => !v)}
        orgId={orgId}
        showNewFolder={showNewFolder}
        newFolderName={newFolderName}
        onNewFolderNameChange={setNewFolderName}
        onToggleNewFolder={() => setShowNewFolder(!showNewFolder)}
        onCreateFolder={createFolder}
        onCancelNewFolder={() => { setShowNewFolder(false); setNewFolderName(""); }}
        onRefresh={fetchData}
      />

      <FileBreadcrumb breadcrumbs={breadcrumbs} onNavigate={navigateToBreadcrumb} />

      <FileList
        loading={loading}
        viewMode={viewMode}
        folders={folders}
        files={files}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={selectAll}
        onNavigateToFolder={navigateToFolder}
        onPreviewFile={(file) => { setPreviewFile(file); setPreviewOpen(true); }}
        onDownloadFile={handleDownload}
        onDuplicateFile={duplicateFile}
        onShareFile={(file) => { setShareFile(file); setShareOpen(true); }}
        onToggleLock={toggleLock}
        onConfirmDelete={confirmDeleteItem}
        onFolderProperties={openFolderProperties}
        onRenameStart={startRename}
        onBulkDelete={doBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        inlineRenamingId={inlineRenamingId}
        inlineRenameValue={inlineRenameValue}
        onInlineRenameChange={setInlineRenameValue}
        onStartInlineRename={startInlineRename}
        onSubmitInlineRename={submitInlineRename}
        onCancelInlineRename={() => setInlineRenamingId(null)}
      />

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

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2Icon className="size-4" />
          {toastMessage}
        </div>
      )}

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

      {propertiesOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setPropertiesOpen(false); setPropertiesData(null); }}>
          <div className="bg-background rounded-lg p-5 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-4">Folder Properties</h3>
            {propertiesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : propertiesData ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Name</span>
                  <p className="font-medium">{propertiesData.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Path</span>
                  <p className="font-mono text-xs">{propertiesData.path}</p>
                </div>
                {propertiesData.createdAt && (
                  <div>
                    <span className="text-muted-foreground text-xs">Created</span>
                    <p>{new Date(propertiesData.createdAt).toLocaleString()}</p>
                  </div>
                )}
                <div className="border-t pt-3">
                  <span className="text-muted-foreground text-xs">Contents</span>
                  <p className="mt-1">{propertiesData.fileCount} file{propertiesData.fileCount !== 1 ? "s" : ""}</p>
                  <p className="text-muted-foreground">{propertiesData.totalSize > 0 ? formatSize(propertiesData.totalSize) : "0 B"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">Failed to load folder properties.</p>
            )}
            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => { setPropertiesOpen(false); setPropertiesData(null); }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


