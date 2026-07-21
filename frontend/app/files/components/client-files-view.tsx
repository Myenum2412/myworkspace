"use client";

import { useState, useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { Building2Icon, FolderIcon, FileIcon, ChevronRightIcon, Loader2Icon, SearchIcon, ArrowLeftIcon, DownloadIcon, FolderOpenIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/file-system/types";

type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

type FileRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
};

type FolderRecord = {
  id: string;
  name: string;
  path: string;
};

export function ClientFilesView() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [clientFiles, setClientFiles] = useState<FileRecord[]>([]);
  const [clientFolders, setClientFolders] = useState<FolderRecord[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const { orgId } = useFileSystemStore();

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/clients?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr: Record<string, unknown>[] = d.data || d || [];
        setClients(arr.map((c: any) => ({ id: c.id, name: c.name, company: c.company || "", email: c.email || "", status: c.status || "Active" })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!selectedClient || !orgId) return;
    setFilesLoading(true);
    Promise.all([
      fetch(`/api/files?orgId=${encodeURIComponent(orgId)}&clientId=${encodeURIComponent(selectedClient.id)}`, { credentials: "include" }).then(r => r.json()),
      fetch(`/api/folders?orgId=${encodeURIComponent(orgId)}&clientId=${encodeURIComponent(selectedClient.id)}`, { credentials: "include" }).then(r => r.json()),
    ])
      .then(([filesRes, foldersRes]) => {
        setClientFiles(filesRes.data || []);
        setClientFolders(foldersRes.data || foldersRes || []);
      })
      .catch(() => {})
      .finally(() => setFilesLoading(false));
  }, [selectedClient, orgId]);

  const filtered = clients.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedClient) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)} className="gap-1.5">
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2Icon className="size-4 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{selectedClient.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedClient.company || selectedClient.email}</p>
            </div>
          </div>
        </div>

        {filesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {clientFolders.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FolderOpenIcon className="size-3.5" />
                  Folders
                </h3>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {clientFolders.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 p-3 rounded-xl border bg-card"
                    >
                      <FolderIcon className="size-5 text-amber-500 shrink-0" />
                      <span className="text-sm font-medium truncate">{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileIcon className="size-3.5" />
                Files {clientFiles.length > 0 && `(${clientFiles.length})`}
              </h3>
              {clientFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                  <FileIcon className="size-12 text-muted-foreground/20" />
                  <p className="text-sm font-medium">No files uploaded</p>
                  <p className="text-xs">No files have been uploaded for this client yet</p>
                </div>
              ) : (
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {clientFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                    >
                      <FileIcon className="size-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.originalName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatSize(f.size)} &middot; {new Date(f.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`/api/files/${f.id}/download`}
                        className="size-8 rounded-md hover:bg-accent flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Download"
                      >
                        <DownloadIcon className="size-4 text-muted-foreground" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Building2Icon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No clients yet</p>
        <p className="text-xs">Create a client to manage their files here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Building2Icon className="size-4" /> Client Files</h2>
          <p className="text-sm text-muted-foreground">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-64">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClient(c)}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group text-left"
          >
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2Icon className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate">{c.company || c.email}</p>
            </div>
            <Badge variant={c.status === "Active Client" ? "default" : "secondary"} className="text-[10px] shrink-0">
              {c.status || "Active"}
            </Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
