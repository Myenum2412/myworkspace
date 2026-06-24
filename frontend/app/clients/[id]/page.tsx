"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  FileText,
  FolderOpen,
  Loader2,
  Settings,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ClientWorkspaceResponse = {
  client: {
    id: string;
    name: string;
    company: string;
    email: string;
    status: string;
    projects: number;
    primaryContact?: string;
  };
  workspace: {
    id: string;
    clientId: string;
    dashboardEnabled: boolean;
    fileManagementEnabled: boolean;
    modules: string[];
    permissions: {
      clientCanViewDashboard: boolean;
      clientCanViewFiles: boolean;
      clientCanUploadFiles: boolean;
      clientCanDeleteFiles: boolean;
    };
  };
  dashboard: {
    metrics: {
      folders: number;
      files: number;
      projects: number;
      reports: number;
      storageBytes: number;
    };
    recentFiles: ClientFile[];
  };
  fileManagement: {
    folders: ClientFolder[];
    files: ClientFile[];
  };
};

type ClientFolder = {
  id: string;
  name: string;
  path: string;
  permissions?: {
    clientCanView: boolean;
    clientCanUpload: boolean;
    clientCanDelete: boolean;
  };
};

type ClientFile = {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  folderId: string | null;
  updatedAt: string;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function ClientWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<ClientWorkspaceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const res = await fetch(`/api/clients/${params.id}/workspace`, { credentials: "include" });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.error || "Failed to load client workspace");
        }
        setWorkspace(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client workspace");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) loadWorkspace();
  }, [params.id]);

  const folderNameById = useMemo(() => {
    const map = new Map<string, string>();
    workspace?.fileManagement.folders.forEach((folder) => map.set(folder.id, folder.name));
    return map;
  }, [workspace]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="size-10 text-red-500" />
        <div>
          <h1 className="text-xl font-semibold">Workspace unavailable</h1>
          <p className="mt-1 text-sm text-muted-foreground">{error || "Client workspace was not found."}</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/clients")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const { client, dashboard, fileManagement } = workspace;
  const metrics = dashboard.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0">
            <Link href="/clients">
              <ArrowLeft className="mr-2 size-4" />
              My Clients
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{client.name}</h1>
              <Badge variant={client.status === "Active Client" ? "default" : "secondary"}>
                {client.status || "No status"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {client.company} · {client.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <QuickLink href="#dashboard" icon={BarChart3} label="Dashboard" />
          <QuickLink href="#files" icon={FolderOpen} label="File Management" />
          <QuickLink href="#projects" icon={Workflow} label="Projects" />
          <QuickLink href="#reports" icon={FileText} label="Reports" />
          <QuickLink href="#settings" icon={Settings} label="Settings" />
        </div>
      </div>

      <section id="dashboard" className="space-y-4 scroll-mt-20">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Client Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <MetricCard title="Folders" value={metrics.folders} />
          <MetricCard title="Files" value={metrics.files} />
          <MetricCard title="Projects" value={metrics.projects} />
          <MetricCard title="Reports" value={metrics.reports} />
          <MetricCard title="Storage" value={formatBytes(metrics.storageBytes)} />
        </div>
      </section>

      <section id="files" className="grid gap-4 scroll-mt-20 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="size-4" />
              File Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fileManagement.folders.map((folder) => (
              <div key={folder.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{folder.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{folder.path}</p>
                  </div>
                  <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  View {folder.permissions?.clientCanView ? "on" : "off"} · Upload {folder.permissions?.clientCanUpload ? "on" : "off"} · Delete {folder.permissions?.clientCanDelete ? "on" : "off"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Files</CardTitle>
          </CardHeader>
          <CardContent>
            {fileManagement.files.length ? (
              <div className="divide-y rounded-md border">
                {fileManagement.files.map((file) => (
                  <div key={file.id} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_140px_100px_120px] md:items-center">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{file.originalName || file.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{file.mimeType}</p>
                    </div>
                    <span className="text-muted-foreground">{folderNameById.get(file.folderId || "") || "Root"}</span>
                    <span className="text-muted-foreground">{file.category}</span>
                    <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Default folders are ready. Uploaded files and generated documents for this client will appear here.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <ModuleCard id="projects" icon={Workflow} title="Projects" detail={`${metrics.projects} linked project records`} />
        <ModuleCard id="reports" icon={FileText} title="Reports" detail={`${metrics.reports} report files linked to this client`} />
        <ModuleCard id="settings" icon={Settings} title="Settings" detail="Workspace access and file permissions are scoped to this Client ID" />
      </div>
    </div>
  );
}

function QuickLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>
        <Icon className="mr-2 size-4" />
        {label}
      </Link>
    </Button>
  );
}

function MetricCard({ title, value }: { title: string; value: string | number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function ModuleCard({ id, icon: Icon, title, detail }: { id: string; icon: LucideIcon; title: string; detail: string }) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
