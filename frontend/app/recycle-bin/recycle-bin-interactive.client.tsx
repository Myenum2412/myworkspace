"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2Icon, RotateCcwIcon, Loader2Icon, FileIcon, AlertTriangleIcon, EyeIcon } from "lucide-react";
import { FileViewDialog } from "@/components/files/file-view-dialog";

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

export default function RecycleBinInteractive({ files: initialFiles }: { files: RecycledFile[] }) {
  const [files, setFiles] = useState<RecycledFile[]>(initialFiles);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewFile, setViewFile] = useState<RecycledFile | null>(null);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore file");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete file permanently");
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
          {files.length === 0 ? (
            <div className="py-12 text-center">
              <Trash2Icon className="size-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Recycle bin is empty.</p>
            </div>
          ) : (
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
              <div className="overflow-x-auto">
                <table className="table-premium w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Name</th>
                    <th className="px-4 py-3.5 font-semibold">Type</th>
                    <th className="px-4 py-3.5 font-semibold">Size</th>
                    <th className="px-4 py-3.5 font-semibold">Deleted</th>
                    <th className="px-4 py-3.5 font-semibold">Uploaded by</th>
                    <th className="px-4 py-3.5 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id} className="border-b last:border-0 bg-white hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setViewFile(f)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon className="size-4 text-muted-foreground shrink-0" />
                          <span className="font-medium truncate max-w-[200px]">{f.originalName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{f.mimeType.split("/").pop()?.toUpperCase() || "FILE"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatSize(f.size)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {f.deletedAt ? new Date(f.deletedAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{f.uploaderName || "—"}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={(e) => { e.stopPropagation(); setViewFile(f); }}
                            >
                              <EyeIcon className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={actionId === f.id}
                              onClick={(e) => { e.stopPropagation(); handleRestore(f.id); }}
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
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(f.id); }}
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
            </div>
          )}
        </CardContent>
      </Card>
      <FileViewDialog
        file={viewFile}
        open={!!viewFile}
        onOpenChange={(open) => { if (!open) setViewFile(null); }}
      />
    </main>
  );
}
