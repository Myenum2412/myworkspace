"use client";

import { useMemo, useState } from "react";
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
  Building2Icon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
  HardDriveIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { FileExplorer } from "@/components/file-explorer";
import { DropZoneUpload } from "@/components/dropzone-upload";

export type ClientFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId: string | null;
};

export type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

export type OrgInfo = {
  id: string;
  name: string;
  logoUrl?: string;
  companyEmail?: string;
  website?: string;
  industry?: string;
  plan?: string;
};

export type FileStats = {
  totalSize?: number;
  totalFiles?: number;
  deletedFiles?: number;
  usedStorage?: number;
  maxStorage?: number;
  mimeTypeBreakdown?: Array<{ _id: string; count: number; size: number }>;
};

export type FilesInteractiveProps = {
  orgInfo: OrgInfo | null;
  clients: ClientRecord[];
  foldersByClient: Record<string, ClientFolder[]>;
  statsByClient: Record<string, { files: number; size: number }>;
  stats: FileStats | null;
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

export default function FilesInteractive({
  orgInfo,
  clients,
  foldersByClient,
  statsByClient,
  stats,
}: FilesInteractiveProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const [search, setSearch] = useState("");

  // View state: browsing a specific client's folder tree
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [activeClientName, setActiveClientName] = useState<string>("");

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);

  const orgId = orgInfo?.id || "";
  const userId = session?.user?.id || "";

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
            onUploadComplete={() => window.location.reload()}
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
      {/* Client Files */}
      <div className="flex items-center justify-end">
        <Button size="sm" onClick={() => router.push("/clients")}>
          <PlusIcon className="mr-1 size-4" /> Manage Clients
        </Button>
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
