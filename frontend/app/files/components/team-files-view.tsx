"use client";

import { useState, useEffect, useCallback } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { UsersIcon, FolderIcon, FileIcon, Loader2Icon, SearchIcon, FolderOpenIcon, UserIcon, DownloadIcon } from "@/lib/icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/file-system/types";

type FolderRecord = {
  id: string;
  name: string;
  path: string;
  clientId: string | null;
  createdBy: string;
  createdAt: string;
};

type FileRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
};

export function TeamFilesView() {
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const setCurrentFolder = useFileSystemStore((s) => s.setCurrentFolder);
  const setCurrentNav = useFileSystemStore((s) => s.setCurrentNav);
  const setBreadcrumbs = useFileSystemStore((s) => s.setBreadcrumbs);
  const { orgId } = useFileSystemStore();

  const openFolder = useCallback((folder: FolderRecord) => {
    setBreadcrumbs([{ id: null, name: "My Files" }, { id: folder.id, name: folder.name }]);
    setCurrentFolder(folder.id);
    setCurrentNav("files");
  }, [setBreadcrumbs, setCurrentFolder, setCurrentNav]);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/folders?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/files?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([foldersRes, filesRes]) => {
        const allFolders: FolderRecord[] = foldersRes.data || foldersRes || [];
        const allFiles: FileRecord[] = filesRes.data || filesRes || [];
        setFolders(allFolders);
        setFiles(allFiles);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const filteredFolders = folders.filter((f) =>
    !search.trim() || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredFiles = files.filter((f) =>
    !search.trim() || f.originalName.toLowerCase().includes(search.toLowerCase()) || (f.uploaderName || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><UsersIcon className="size-4" /> Team Files</h2>
          <p className="text-sm text-muted-foreground">
            {folders.length} folder{folders.length !== 1 ? "s" : ""} &middot; {files.length} file{files.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="relative w-64">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Search folders & files..." className="pl-8 h-9 text-sm bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <UsersIcon className="size-12 text-muted-foreground/20" />
          <p className="text-sm font-medium">No team files yet</p>
          <p className="text-xs">Upload files or create folders to get started</p>
        </div>
      ) : (
        <>
          {filteredFolders.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FolderOpenIcon className="size-3.5" />
                Folders ({filteredFolders.length})
              </h3>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {filteredFolders.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-2 p-3 rounded-sm border bg-card cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
                    onDoubleClick={() => openFolder(f)}
                    title="Double-click to open"
                  >
                    <FolderIcon className="size-5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{f.name}</span>
                      {f.clientId && (
                        <span className="text-[10px] text-muted-foreground">Client folder</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredFiles.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileIcon className="size-3.5" />
                Files ({filteredFiles.length})
              </h3>
              <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center gap-3 p-3 rounded-sm border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                  >
                    <FileIcon className="size-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{f.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(f.size)} &middot; {new Date(f.createdAt).toLocaleDateString()}
                        {f.uploaderName ? ` &middot; ${f.uploaderName}` : ""}
                      </p>
                    </div>
                    <a
                      href={`/api/files/${f.id}/download`}
                      className="size-8 rounded-sm hover:bg-accent flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Download"
                    >
                      <DownloadIcon className="size-4 text-muted-foreground" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
