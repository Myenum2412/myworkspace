"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertCircleIcon,
  Building2Icon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react";
import { FileExplorer } from "@/components/file-explorer";
import { FileUploadDialog } from "@/components/file-upload-dialog";

type ClientFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId: string | null;
  permissions?: {
    clientCanView: boolean;
    clientCanUpload: boolean;
    clientCanDelete: boolean;
  };
};

type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

interface ClientFileManagerProps {
  orgId: string;
  userId: string;
}

/**
 * Client File Manager — scoped view that shows all clients in the org,
 * their provisioned folders, and opens a per-client FileExplorer.
 *
 * This is the production UI for "Client File Management" in /orgmenu/files.
 * The data source is the canonical `folders` + `file_attachments` collections;
 * both `/clients/:id/workspace` (backend proxy) and the file explorer use the
 * same underlying documents, guaranteeing a single source of truth.
 */
export function ClientFileManager({ orgId, userId }: ClientFileManagerProps) {
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [foldersByClient, setFoldersByClient] = useState<Record<string, ClientFolder[]>>({});
  const [statsByClient, setStatsByClient] = useState<Record<string, { files: number; size: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // View state: browsing a specific client's folder tree
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string>("");

  // Dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadClientId, setUploadClientId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ orgId });
      const [clientsRes, foldersRes] = await Promise.all([
        fetch(`/api/clients?${params}`, { credentials: "include" }),
        fetch(`/api/folders?${params}`, { credentials: "include" }),
      ]);

      if (!clientsRes.ok || !foldersRes.ok) {
        throw new Error(`API error: clients=${clientsRes.status} folders=${foldersRes.status}`);
      }

      const clientsData = await clientsRes.json();
      const foldersData = await foldersRes.json();

      const list: ClientRecord[] = Array.isArray(clientsData.data) ? clientsData.data : [];
      const allFolders: ClientFolder[] = Array.isArray(foldersData.data) ? foldersData.data : [];

      setClients(list);

      // Group folders by clientId (only top-level). Non-client folders sit under null.
      const grouped: Record<string, ClientFolder[]> = {};
      for (const f of allFolders) {
        const key = f.clientId || "__org__";
        if (!grouped[key]) grouped[key] = [];
        if (f.parentId === null) grouped[key].push(f);
      }
      setFoldersByClient(grouped);

      // Pull file counts per client via workspace endpoint (backend aggregate).
      // Parallel but tolerate individual failures.
      const statsEntries = await Promise.all(
        list.map(async (c) => {
          try {
            const r = await fetch(`/api/clients/${encodeURIComponent(c.id)}/workspace`, { credentials: "include" });
            if (!r.ok) return [c.id, { files: 0, size: 0 }] as const;
            const d = await r.json();
            const files = d?.data?.dashboard?.metrics?.files || 0;
            const size = d?.data?.dashboard?.metrics?.storageBytes || 0;
            return [c.id, { files, size }] as const;
          } catch {
            return [c.id, { files: 0, size: 0 }] as const;
          }
        }),
      );
      setStatsByClient(Object.fromEntries(statsEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load client folders");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openClient = (id: string, name: string) => {
    setActiveClientId(id);
    setActiveClientName(name);
  };

  const closeClient = () => {
    setActiveClientId(null);
    setActiveClientName("");
  };

  const onUpload = (clientId: string) => {
    setUploadClientId(clientId);
    setUploadOpen(true);
  };

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q),
    );
  }, [clients, search]);

  // ── Inside a client: use the existing FileExplorer ────────────────────
  if (activeClientId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeClient}>
            ← Back to Clients
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={closeClient} className="cursor-pointer">
                  Clients
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold">{activeClientName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onUpload(activeClientId)}>
            <UploadIcon className="mr-2 size-4" /> Upload to Client
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/clients/${activeClientId}#files`)}
          >
            Open Workspace
          </Button>
        </div>

        <FileExplorer orgId={orgId} userId={userId} clientId={activeClientId} />

        <FileUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          orgId={orgId}
          clientId={uploadClientId}
          onUploadComplete={() => {
            setUploadOpen(false);
            fetchData();
          }}
        />
      </div>
    );
  }

  // ── Client grid ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <AlertCircleIcon className="size-10 text-red-500" />
        <div>
          <h1 className="text-xl font-semibold">Unable to load client folders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2Icon className="size-6" />
            Client File Management
          </h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""} · folders are shared with the client workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{clients.length} clients</Badge>
          <Button variant="outline" onClick={() => router.push("/clients")}>
            Manage Clients
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredClients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2Icon className="size-16 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {search ? "No clients match your search." : "No clients yet. Create a client to provision folders."}
            </p>
            {!search && (
              <Button asChild size="sm">
                <Link href="/clients">
                  <PlusIcon className="mr-2 size-4" /> Create Client
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClients.map((c) => {
            const folders = foldersByClient[c.id] || [];
            const stats = statsByClient[c.id] || { files: 0, size: 0 };
            return (
              <Card
                key={c.id}
                className="group cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => openClient(c.id, c.name)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2Icon className="size-4 text-muted-foreground" />
                    <span className="truncate">{c.name}</span>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">{c.company} · {c.email}</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FolderIcon className="size-3" /> {folders.length} folders
                    </span>
                    <span className="flex items-center gap-1">
                      <FileIcon className="size-3" /> {stats.files} files
                    </span>
                  </div>

                  {folders.length > 0 ? (
                    <div className="space-y-1">
                      {folders.slice(0, 4).map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FolderOpenIcon className="size-3 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </div>
                      ))}
                      {folders.length > 4 && (
                        <p className="text-xs text-muted-foreground">+{folders.length - 4} more</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No folders provisioned</p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant={c.status === "Active Client" ? "default" : "secondary"} className="text-[10px]">
                      {c.status || "No status"}
                    </Badge>
                    <ChevronRightIcon className="size-3 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create client folder</DialogTitle>
            <DialogDescription>Choose a client and folder name.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
