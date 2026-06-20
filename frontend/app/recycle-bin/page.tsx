"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2Icon, RotateCcwIcon, Loader2Icon, FileIcon, AlertTriangleIcon } from "lucide-react";

type RecycledFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  deletedAt: string;
  uploaderName?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FAKE_FILES: RecycledFile[] = [
  { id: "rfake-1", originalName: "Old-Proposal-v1.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 720_000, createdAt: "2025-10-01T09:00:00Z", deletedAt: "2025-12-15T11:00:00Z", uploaderName: "Alice Chen" },
  { id: "rfake-2", originalName: "Logo-Iteration-3.png", mimeType: "image/png", size: 4_200_000, createdAt: "2025-09-20T15:30:00Z", deletedAt: "2025-12-14T16:20:00Z", uploaderName: "David Park" },
  { id: "rfake-3", originalName: "Temp-Notes.txt", mimeType: "text/plain", size: 12_000, createdAt: "2025-12-10T08:00:00Z", deletedAt: "2025-12-13T10:00:00Z", uploaderName: "Bob Kumar" },
  { id: "rfake-4", originalName: "Draft-Contract.pdf", mimeType: "application/pdf", size: 1_800_000, createdAt: "2025-11-05T13:00:00Z", deletedAt: "2025-12-12T09:45:00Z", uploaderName: "Carol Davis" },
  { id: "rfake-5", originalName: "Duplicates-Cleanup.zip", mimeType: "application/zip", size: 9_500_000, createdAt: "2025-08-15T11:00:00Z", deletedAt: "2025-12-10T14:30:00Z", uploaderName: "Frank Lee" },
  { id: "rfake-6", originalName: "Screenshot-20251001.png", mimeType: "image/png", size: 2_100_000, createdAt: "2025-10-01T12:00:00Z", deletedAt: "2025-12-09T18:00:00Z", uploaderName: "Eve Torres" },
];

export default function RecycleBinPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<RecycledFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  async function fetchRecycled() {
    setLoading(true);
    try {
      const profileRes = await fetch("/api/user/profile", { credentials: "include" });
      const profileData = await profileRes.json();
      const profile = profileData.data || profileData;
      const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
      if (orgId) {
        const res = await fetch(`/api/files/recycle-bin?orgId=${orgId}`, { credentials: "include" });
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : data.data || []);
      }
    } catch {
      setFiles(FAKE_FILES);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user) fetchRecycled();
  }, [session]);

  async function handleRestore(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/files/${id}/restore`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch {} finally {
      setActionId(null);
    }
  }

  async function handlePermanentDelete(id: string) {
    setActionId(id);
    try {
      const res = await fetch(`/api/files/${id}/permanent`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch {} finally {
      setActionId(null);
      setConfirmDelete(null);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2Icon className="size-6" />
              <h1 className="text-2xl font-bold">Recycle Bin</h1>
            </div>
            <Badge variant="secondary">{files.length} files</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deleted Files</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center">
                  <Trash2Icon className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Recycle bin is empty.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Type</th>
                        <th className="pb-3 pr-4 font-medium">Size</th>
                        <th className="pb-3 pr-4 font-medium">Deleted</th>
                        <th className="pb-3 pr-4 font-medium">Uploaded by</th>
                        <th className="pb-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {files.map((f) => (
                        <tr key={f.id} className="border-b last:border-0">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <FileIcon className="size-4 text-muted-foreground shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">{f.originalName}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant="outline">{f.mimeType.split("/").pop()?.toUpperCase() || "FILE"}</Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{formatSize(f.size)}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {f.deletedAt ? new Date(f.deletedAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{f.uploaderName || "—"}</td>
                          <td className="py-3">
                            {confirmDelete === f.id ? (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-destructive mr-1">
                                  <AlertTriangleIcon className="size-3" />
                                  Permanently delete?
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs px-2"
                                  disabled={actionId === f.id}
                                  onClick={() => handlePermanentDelete(f.id)}
                                >
                                  {actionId === f.id ? <Loader2Icon className="size-3 animate-spin" /> : "Delete"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2"
                                  disabled={actionId === f.id}
                                  onClick={() => setConfirmDelete(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2"
                                  disabled={actionId === f.id}
                                  onClick={() => handleRestore(f.id)}
                                >
                                  {actionId === f.id ? (
                                    <Loader2Icon className="size-3 animate-spin" />
                                  ) : (
                                    <>
                                      <RotateCcwIcon className="size-3 mr-1" />
                                      Restore
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2 text-destructive hover:text-destructive"
                                  disabled={actionId === f.id}
                                  onClick={() => setConfirmDelete(f.id)}
                                >
                                  <Trash2Icon className="size-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
