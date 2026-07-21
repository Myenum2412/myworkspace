"use client";

import { useState, useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { UserIcon, FileIcon, Loader2Icon, SearchIcon, BriefcaseIcon, ArrowLeftIcon, FolderIcon, DownloadIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/file-system/types";

type StaffRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
};

type FileRecord = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
  uploaderId: string;
};

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("sheet")) return "📊";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "📦";
  return "📁";
}

export function StaffFilesView() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffRecord | null>(null);
  const [staffFiles, setStaffFiles] = useState<FileRecord[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const { orgId } = useFileSystemStore();

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/employees?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr: Record<string, unknown>[] = d.data || d || [];
        setStaff(arr.map((s: any) => ({
          id: s.id || s._id,
          name: s.name || s.fullName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email,
          email: s.email || "",
          role: s.role || s.jobTitle || "Employee",
          department: s.department || s.departmentName || "",
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  useEffect(() => {
    if (!selectedStaff || !orgId) return;
    setFilesLoading(true);
    fetch(`/api/files?orgId=${encodeURIComponent(orgId)}&uploaderId=${encodeURIComponent(selectedStaff.id)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        setStaffFiles(d.data || []);
      })
      .catch(() => {})
      .finally(() => setFilesLoading(false));
  }, [selectedStaff, orgId]);

  const filtered = staff.filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedStaff) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedStaff(null)} className="gap-1.5">
            <ArrowLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-accent flex items-center justify-center">
              <UserIcon className="size-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{selectedStaff.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedStaff.department || selectedStaff.role}</p>
            </div>
          </div>
        </div>

        {filesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : staffFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <FileIcon className="size-12 text-muted-foreground/20" />
            <p className="text-sm font-medium">No files uploaded</p>
            <p className="text-xs">This staff member hasn&apos;t uploaded any files yet</p>
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {staffFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <span className="text-xl shrink-0">{getFileIcon(f.mimeType)}</span>
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
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <UserIcon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No staff members yet</p>
        <p className="text-xs">Add employees to manage their files here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><UserIcon className="size-4" /> Staff Files</h2>
          <p className="text-sm text-muted-foreground">{staff.length} staff member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-64">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Search staff..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStaff(s)}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group text-left"
          >
            <div className="size-10 rounded-full bg-accent flex items-center justify-center shrink-0">
              <UserIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground truncate">{s.department || s.role || s.email}</p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{s.role}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
