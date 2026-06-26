"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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



export default function RecycleBinPage() {
  const { data: session } = useSession();
    const [files, setFiles] = useState<RecycledFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  
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
    } catch (error) {
      console.error("[RECYCLE-BIN] Failed to fetch:", error);
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
    } catch (error) {
      console.error("[RECYCLE-BIN] Failed to restore:", error);
    } finally {
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
    } catch (error) {
      console.error("[RECYCLE-BIN] Failed to delete:", error);
    } finally {
      setActionId(null);
      setConfirmDelete(null);
    }
  }

  return (
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
                    <thead className="bg-blue-50">
                      <tr className="border-b bg-blue-50 text-left text-sm text-blue-800 font-medium">
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
                        <tr key={f.id} className="border-b last:border-0 bg-white hover:bg-blue-50/50 transition-colors">
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
            );
}
