"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
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
import FolderIcon from "@mui/icons-material/Folder";
import {
  Building2Icon,
  ChevronRightIcon,
  FileIcon,
  HardDriveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  DownloadIcon,
  EyeIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileExplorer } from "@/components/file-explorer";
import { UploadThingDropzone } from "@/components/elements/uploadthing-dropzone";

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

export type FileRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploaderName: string;
  uploaderId: string;
  clientId: string;
  createdAt: string;
  updatedAt: string;
  category: string;
};

export type FilesInteractiveProps = {
  orgInfo: OrgInfo | null;
  clients: ClientRecord[];
  foldersByClient: Record<string, ClientFolder[]>;
  statsByClient: Record<string, { files: number; size: number }>;
  stats: FileStats | null;
  allFiles?: FileRecord[];
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

function formatBytesLocal(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function FilesInteractive({
  orgInfo,
  clients,
  foldersByClient,
  statsByClient,
  stats,
  allFiles = [],
}: FilesInteractiveProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();

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
      <div className="space-y-4 min-w-0 max-w-full">
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

        <div className="flex flex-wrap items-center gap-2">
          <Button variant={uploadOpen ? "secondary" : "outline"} size="sm" onClick={() => setUploadOpen((v) => !v)}>
            <UploadIcon className="mr-2 size-4" /> {uploadOpen ? "Close Upload" : "Upload"}
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
          <UploadThingDropzone
            accept="*"
            maxFiles={10}
            maxSize={32 * 1024 * 1024}
            onUpload={async (files) => {
              const results = [];
              for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                if (activeClientId) formData.append("clientId", activeClientId);
                const res = await fetch("/api/files/upload", {
                  method: "POST",
                  credentials: "include",
                  body: formData,
                });
                if (res.ok) {
                  const json = await res.json();
                  results.push({
                    name: json.data?.originalName || file.name,
                    size: file.size,
                    type: file.type,
                    url: json.data?.url || "",
                  });
                }
              }
              setUploadOpen(false);
              queryClient.invalidateQueries({ queryKey: ["files", orgId] });
              queryClient.invalidateQueries({ queryKey: ["folders"] });
              router.refresh();
              return results;
            }}
          />
        )}

        <FileExplorer orgId={orgId} userId={userId} clientId={activeClientId} />
      </div>
    );
  }

  // ── Main view: Company details + Client folders ───────────────────
  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Header Row: Title + Actions */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Files</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and organize your client files and folders</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative w-56">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder=""
              className="pl-9 h-9 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => router.push("/clients")}>
            <PlusIcon className="mr-1 size-4" /> Manage Clients
          </Button>
        </div>
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
                          <FolderIcon className="size-3 shrink-0" />
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

      {/* All Files Table */}
      {allFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Files</h2>
            <Badge variant="secondary">{allFiles.length} files</Badge>
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3 hidden md:table-cell">Owner</th>
                  <th className="px-4 py-3 text-right">Size</th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell">Modified</th>
                  <th className="px-4 py-3 text-right w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allFiles.map((file) => (
                  <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileIcon className="size-4 text-muted-foreground shrink-0" />
                        <span className="truncate max-w-[250px]">{file.originalName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {file.uploaderName || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-right">
                      {formatBytesLocal(file.size)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground text-right hidden lg:table-cell">
                      {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-6">
                            <MoreHorizontalIcon className="size-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`/api/files/${file.id}`, "_blank")}>
                            <EyeIcon className="mr-2 size-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const a = document.createElement("a");
                            a.href = `/api/files/${file.id}`;
                            a.download = file.originalName;
                            a.click();
                          }}>
                            <DownloadIcon className="mr-2 size-4" /> Download
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
