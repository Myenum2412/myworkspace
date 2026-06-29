"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
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
  HardDriveIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { FileExplorer } from "@/components/file-explorer";
import { DropZoneUpload } from "@/components/dropzone-upload";

type ClientFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId: string | null;
};

type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

type OrgInfo = {
  id: string;
  name: string;
  logoUrl?: string;
  companyEmail?: string;
  website?: string;
  industry?: string;
  plan?: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatSizeMB(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

export default function FilesPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [orgInfo, setOrgInfo] = useState<OrgInfo | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [foldersByClient, setFoldersByClient] = useState<Record<string, ClientFolder[]>>({});
  const [statsByClient, setStatsByClient] = useState<Record<string, { files: number; size: number }>>({});
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // View state: browsing a specific client's folder tree
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string>("");

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);

  const orgId = orgInfo?.id || "";
  const userId = session?.user?.id || "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // First get profile to resolve orgId
      const profileRes = await fetch("/api/user/profile", { credentials: "include" });
      const profileData = await profileRes.json();
      const p = profileData.data || profileData;
      const resolvedOrgId = p?.org?.id || p?.org?._id?.toString() || "";

      if (p?.org) {
        setOrgInfo({
          id: p.org.id || p.org._id,
          name: p.org.name || "",
          logoUrl: p.org.logoUrl || "",
          companyEmail: p.org.companyEmail || "",
          website: p.org.website || "",
          industry: p.org.industry || "",
          plan: p.org.plan || "starter",
        });
      }

      if (!resolvedOrgId) {
        setError("No organization found for your account.");
        setLoading(false);
        return;
      }

      const [clientsRes, foldersRes, statsRes] = await Promise.all([
        fetch(`/api/clients?orgId=${encodeURIComponent(resolvedOrgId)}`, { credentials: "include" }),
        fetch(`/api/folders?orgId=${encodeURIComponent(resolvedOrgId)}`, { credentials: "include" }),
        fetch(`/api/files/stats`, { credentials: "include" }),
      ]);

      if (!clientsRes.ok || !foldersRes.ok) {
        throw new Error(`API error: clients=${clientsRes.status} folders=${foldersRes.status}`);
      }

      const clientsData = await clientsRes.json();
      const foldersData = await foldersRes.json();
      const statsData = await statsRes.json();

      setStats(statsData.data || null);

      const list: ClientRecord[] = Array.isArray(clientsData.data) ? clientsData.data : [];
      const allFolders: ClientFolder[] = Array.isArray(foldersData.data) ? foldersData.data : [];

      setClients(list);

      // Group folders by clientId
      const grouped: Record<string, ClientFolder[]> = {};
      for (const f of allFolders) {
        if (f.parentId !== null) continue;
        const key = f.clientId || "__org__";
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(f);
      }
      setFoldersByClient(grouped);

      // Per-client file stats
      const statsEntries = await Promise.all(
        list.map(async (c) => {
          try {
            const r = await fetch(
              `/api/files/stats?orgId=${encodeURIComponent(resolvedOrgId)}&clientId=${encodeURIComponent(c.id)}`,
              { credentials: "include" },
            );
            if (!r.ok) return [c.id, { files: 0, size: 0 }] as const;
            const d = await r.json();
            const files = d?.data?.totalFiles || 0;
            const size = d?.data?.totalSize || 0;
            return [c.id, { files, size }] as const;
          } catch {
            return [c.id, { files: 0, size: 0 }] as const;
          }
        }),
      );
      setStatsByClient(Object.fromEntries(statsEntries));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)),
    );
  }, [clients, search]);

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <AlertCircleIcon className="size-10 text-red-500" />
        <div>
          <h1 className="text-xl font-semibold">Unable to load files</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  // ── Inside a client: use the existing FileExplorer ────────────────
  if (activeClientId && orgId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={closeClient}>
            ← Back
          </Button>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={closeClient} className="cursor-pointer">
                  Files
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
          <Button variant={uploadOpen ? "secondary" : "outline"} size="sm" onClick={() => setUploadOpen((v) => !v)}>
            <UploadIcon className="mr-2 size-4" /> {uploadOpen ? "Close Upload" : "Upload to Client"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/clients/${activeClientId}#files`)}
          >
            Open Workspace
          </Button>
        </div>

        {uploadOpen && (
          <DropZoneUpload
            orgId={orgId}
            clientId={activeClientId}
            onUploadComplete={fetchData}
            maxConcurrency={3}
          />
        )}

        <FileExplorer orgId={orgId} userId={userId} clientId={activeClientId} />
      </div>
    );
  }

  // ── Main view: Company details + Client folders ───────────────────
  return (
    <div className="space-y-6">
      {/* Company Details Header */}
      {orgInfo && (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex items-center justify-center size-14 rounded-xl bg-primary/10 text-primary shrink-0">
              {orgInfo.logoUrl ? (
                <img src={orgInfo.logoUrl} alt={orgInfo.name} className="size-10 rounded-lg object-cover" />
              ) : (
                <Building2Icon className="size-7" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">{orgInfo.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
                {orgInfo.industry && <span>{orgInfo.industry}</span>}
                {orgInfo.companyEmail && <span>· {orgInfo.companyEmail}</span>}
                {orgInfo.website && <span>· {orgInfo.website}</span>}
              </div>
            </div>
            <Badge variant="secondary" className="capitalize shrink-0">
              {orgInfo.plan} plan
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Storage Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HardDriveIcon className="size-4" /> Total Storage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalSize || 0} MB</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileIcon className="size-4" /> Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.totalFiles || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2Icon className="size-4" /> Total Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{clients.length}</p>
            </CardContent>
          </Card>
          <Link href="/recycle-bin">
            <Card className="hover:border-muted-foreground/30 cursor-pointer transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trash2Icon className="size-4" /> Deleted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats.deletedFiles || 0}</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Client File Management Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FolderOpenIcon className="size-5" />
            Folders & Files
          </h2>
          <p className="text-sm text-muted-foreground">
            {clients.length} client{clients.length !== 1 ? "s" : ""} · click a client to browse their files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push("/clients")}>
            <PlusIcon className="mr-1 size-4" /> Manage Clients
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          className="pl-9 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client Grid */}
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
            const clientStats = statsByClient[c.id] || { files: 0, size: 0 };
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
                  <p className="text-xs text-muted-foreground truncate">
                    {c.company ? `${c.company} · ` : ""}{c.email}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FolderIcon className="size-3" /> {folders.length} folders
                    </span>
                    <span className="flex items-center gap-1">
                      <FileIcon className="size-3" /> {clientStats.files} files
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
                    <Badge
                      variant={c.status === "Active Client" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
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
    </div>
  );
}
