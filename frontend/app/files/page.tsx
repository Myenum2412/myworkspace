"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileIcon,
  FolderIcon,
  Loader2Icon,
  DownloadIcon,
  PencilIcon,
  EyeIcon,
  UploadIcon,
  SaveIcon,
  AlertCircleIcon,
  FileTextIcon,
  ImageIcon,
  ArchiveIcon,
} from "lucide-react";

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
  uploaderAvatar: string;
  projectId: string | null;
  projectName: string | null;
  description: string;
  storagePath: string;
};

const FAKE_FILES: FileItem[] = [
  { id: "fake-1", originalName: "Q4-Report.pdf", mimeType: "application/pdf", size: 2_400_000, createdAt: "2025-12-01T10:00:00Z", uploaderName: "Alice Chen", uploaderAvatar: "", projectId: "p1", projectName: "Website Redesign", description: "Quarterly performance report", storagePath: "" },
  { id: "fake-2", originalName: "Proposal-Draft.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 860_000, createdAt: "2025-11-28T14:30:00Z", uploaderName: "Bob Kumar", uploaderAvatar: "", projectId: "p2", projectName: "Mobile App", description: "Initial proposal draft for client review", storagePath: "" },
  { id: "fake-3", originalName: "Budget-2026.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 1_200_000, createdAt: "2025-11-25T09:15:00Z", uploaderName: "Carol Davis", uploaderAvatar: "", projectId: "p1", projectName: "Website Redesign", description: "Annual budget breakdown", storagePath: "" },
  { id: "fake-4", originalName: "Screenshot-Mockup.png", mimeType: "image/png", size: 3_100_000, createdAt: "2025-11-22T16:45:00Z", uploaderName: "David Park", uploaderAvatar: "", projectId: "p3", projectName: "Marketing Campaign", description: "Homepage mockup screenshot", storagePath: "" },
  { id: "fake-5", originalName: "Archive-Backup.zip", mimeType: "application/zip", size: 15_800_000, createdAt: "2025-11-20T08:00:00Z", uploaderName: "Eve Torres", uploaderAvatar: "", projectId: null, projectName: null, description: "Project backup archive", storagePath: "" },
  { id: "fake-6", originalName: "Meeting-Notes.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 320_000, createdAt: "2025-11-18T11:20:00Z", uploaderName: "Frank Lee", uploaderAvatar: "", projectId: "p2", projectName: "Mobile App", description: "Sprint planning meeting notes", storagePath: "" },
  { id: "fake-7", originalName: "API-Specs.pdf", mimeType: "application/pdf", size: 1_800_000, createdAt: "2025-11-15T13:00:00Z", uploaderName: "Alice Chen", uploaderAvatar: "", projectId: "p1", projectName: "Website Redesign", description: "REST API specification document", storagePath: "" },
  { id: "fake-8", originalName: "Brand-Guidelines.pdf", mimeType: "application/pdf", size: 5_200_000, createdAt: "2025-11-10T09:30:00Z", uploaderName: "Carol Davis", uploaderAvatar: "", projectId: "p3", projectName: "Marketing Campaign", description: "Brand style guide and assets", storagePath: "" },
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-4 text-blue-500" />;
  if (mimeType.includes("pdf")) return <FileTextIcon className="size-4 text-red-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return <ArchiveIcon className="size-4 text-amber-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("spreadsheet")) return <FileTextIcon className="size-4 text-emerald-500" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileTextIcon className="size-4 text-blue-600" />;
  return <FileIcon className="size-4 text-muted-foreground" />;
}

function isPreviewable(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.includes("pdf");
}

export default function FilesPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View dialog
  const [viewFile, setViewFile] = useState<FileItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Edit dialog
  const [editFile, setEditFile] = useState<FileItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editError, setEditError] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  const fetchFiles = useCallback(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const id = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (id) {
          fetch(`/api/files?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((data) => {
              const list = Array.isArray(data) ? data : data.data || [];
              setFiles(list.length > 0 ? list : FAKE_FILES);
            })
            .catch(() => setFiles(FAKE_FILES))
            .finally(() => setLoading(false));
        } else {
          setFiles(FAKE_FILES);
          setLoading(false);
        }
      })
      .catch(() => { setFiles(FAKE_FILES); setLoading(false); });
  }, [session]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Group files by project
  const grouped = files.reduce<Record<string, { projectName: string; files: FileItem[] }>>((acc, f) => {
    const key = f.projectId || "__unassigned";
    if (!acc[key]) {
      acc[key] = { projectName: f.projectName || "Unassigned", files: [] };
    }
    acc[key].files.push(f);
    return acc;
  }, {});

  function openView(file: FileItem) {
    setViewFile(file);
    setViewOpen(true);
  }

  function openEdit(file: FileItem) {
    setEditFile(file);
    setEditName(file.originalName);
    setEditDesc(file.description || "");
    setEditError("");
    setEditOpen(true);
  }

  async function handleEditSave() {
    if (!editFile || !editName.trim()) {
      setEditError("File name is required.");
      return;
    }
    setEditError("");
    setEditSubmitting(true);

    try {
      const res = await fetch(`/api/files/${editFile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ originalName: editName.trim(), description: editDesc.trim() }),
      });
      if (res.ok) {
        setFiles((prev) => prev.map((f) =>
          f.id === editFile.id
            ? { ...f, originalName: editName.trim(), description: editDesc.trim() }
            : f
        ));
        setEditOpen(false);
        setEditFile(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setEditError(d.error || "Failed to update file");
      }
    } catch {
      setFiles((prev) => prev.map((f) =>
        f.id === editFile.id
          ? { ...f, originalName: editName.trim(), description: editDesc.trim() }
          : f
      ));
      setEditOpen(false);
      setEditFile(null);
    } finally {
      setEditSubmitting(false);
    }
  }

  function handleDownload(file: FileItem) {
    window.open(`/api/files/${file.id}?download=true`, "_blank");
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FolderIcon className="size-6" /> File Manager
              </h1>
              <p className="text-sm text-muted-foreground">Project-related files and reports</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{files.length} files</Badge>
              <Button onClick={() => window.location.href = "/upload"}>
                <UploadIcon className="mr-2 size-4" />
                Upload File
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <FolderIcon className="size-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
                <Button onClick={() => window.location.href = "/upload"} variant="outline">
                  <UploadIcon className="mr-2 size-4" />
                  Upload your first file
                </Button>
              </CardContent>
            </Card>
          ) : (
            Object.entries(grouped).map(([projectId, group]) => (
              <Card key={projectId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <FolderIcon className="size-4" />
                    {group.projectName}
                    <Badge variant="outline" className="ml-auto text-[10px]">{group.files.length} file(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y bg-muted/30 text-left text-xs text-muted-foreground">
                          <th className="px-4 py-2.5 font-medium">Name</th>
                          <th className="px-4 py-2.5 font-medium">Type</th>
                          <th className="px-4 py-2.5 font-medium">Size</th>
                          <th className="px-4 py-2.5 font-medium">Uploaded</th>
                          <th className="px-4 py-2.5 font-medium">By</th>
                          <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.files.map((f) => (
                          <tr
                            key={f.id}
                            className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => openView(f)}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {getFileIcon(f.mimeType)}
                                <span className="font-medium text-sm">{f.originalName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {f.mimeType.split("/").pop()?.toUpperCase() || "FILE"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground text-sm">{formatSize(f.size)}</td>
                            <td className="px-4 py-3 text-muted-foreground text-sm">
                              {new Date(f.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{f.uploaderName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon-sm" onClick={() => openView(f)} title="View">
                                  <EyeIcon className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" onClick={() => openEdit(f)} title="Edit">
                                  <PencilIcon className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon-sm" onClick={() => handleDownload(f)} title="Download">
                                  <DownloadIcon className="size-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </main>
      </SidebarInset>

      {/* View File Dialog */}
      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setViewFile(null); } }}>
        <DialogContent className="p-0 flex flex-col max-w-3xl">
          {viewFile && (
            <>
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  {getFileIcon(viewFile.mimeType)}
                  {viewFile.originalName}
                </DialogTitle>
                <DialogDescription>
                  {viewFile.projectName ? `Project: ${viewFile.projectName}` : "Unassigned"}
                  {" · "}
                  {formatSize(viewFile.size)}
                  {" · "}
                  Uploaded {new Date(viewFile.createdAt).toLocaleDateString()} by {viewFile.uploaderName}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
                {viewFile.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{viewFile.description}</p>
                  </div>
                )}

                <Separator />

                {/* Preview */}
                <div className="rounded-lg border bg-muted/20 overflow-hidden">
                  {isPreviewable(viewFile.mimeType) ? (
                    <iframe
                      src={`/api/files/${viewFile.id}`}
                      className="w-full h-[400px] border-0"
                      title={viewFile.originalName}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                      <FileIcon className="size-12" />
                      <p className="text-sm">Preview not available for this file type</p>
                      <Button variant="outline" onClick={() => handleDownload(viewFile)}>
                        <DownloadIcon className="mr-2 size-4" />
                        Download to view
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Type</p>
                    <p className="font-medium mt-0.5">{viewFile.mimeType}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Size</p>
                    <p className="font-medium mt-0.5">{formatSize(viewFile.size)}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Uploaded By</p>
                    <p className="font-medium mt-0.5">{viewFile.uploaderName}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Uploaded At</p>
                    <p className="font-medium mt-0.5">{new Date(viewFile.createdAt).toLocaleDateString()}</p>
                  </div>
                  {viewFile.projectName && (
                    <div className="rounded-lg border bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Project</p>
                      <p className="font-medium mt-0.5">{viewFile.projectName}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
                <Button variant="outline" onClick={() => openEdit(viewFile)}>
                  <PencilIcon className="size-3.5 mr-1.5" />
                  Edit
                </Button>
                <Button onClick={() => handleDownload(viewFile)}>
                  <DownloadIcon className="size-3.5 mr-1.5" />
                  Download
                </Button>
                <Button variant="outline" onClick={() => { setViewOpen(false); setViewFile(null); }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit File Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditFile(null); setEditError(""); } }}>
        <DialogContent className="p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <PencilIcon className="size-5" />
              Edit File
            </DialogTitle>
            <DialogDescription>
              Update file name and description.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {editError}
            </div>
          )}

          <div className="px-6 py-3 space-y-3">
            <div>
              <Label htmlFor="fileName" className="text-sm">File Name *</Label>
              <Input
                id="fileName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter file name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fileDesc" className="text-sm">Description</Label>
              <Textarea
                id="fileDesc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Brief description of the file"
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditFile(null); setEditError(""); }} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editSubmitting || !editName.trim()}>
              {editSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : <><SaveIcon className="size-3.5 mr-1.5" />Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
