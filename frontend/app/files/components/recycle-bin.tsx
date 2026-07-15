"use client";

import { useState } from "react";
import { useRecycleBin } from "@/hooks/file-system/use-file-data";
import { formatSize, getFileExtension } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import {
  Trash2Icon,
  RotateCcwIcon,
  AlertTriangleIcon,
  SearchIcon,
  FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFileSystemStore } from "@/lib/file-system/store";
import * as api from "@/lib/file-system/api";

export function RecycleBin() {
  const { orgId, search, setSearch } = useFileSystemStore();
  const { data: files, isLoading, refetch } = useRecycleBin();
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleRestore(id: string) {
    setRestoring(id);
    try { await api.restoreFile(id); refetch(); } catch (e) { console.error(e); }
    finally { setRestoring(null); }
  }

  async function handlePermanentDelete(id: string) {
    if (!confirm("Permanently delete this file? This cannot be undone.")) return;
    setDeleting(id);
    try { await api.permanentDeleteFile(id); refetch(); } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  }

  async function handleEmptyBin() {
    if (!confirm(`Permanently delete all ${files?.length || 0} files in the recycle bin?`)) return;
    if (!files) return;
    const ids = files.map((f) => f.id);
    try { await api.bulkPermanentDelete(ids); refetch(); } catch (e) { console.error(e); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trash2Icon className="size-4" /> Recycle Bin
          </h2>
          <p className="text-sm text-muted-foreground">
            {files?.length || 0} deleted file{(files?.length || 0) !== 1 ? "s" : ""}
          </p>
        </div>
        {(files?.length || 0) > 0 && (
          <Button variant="destructive" size="sm" onClick={handleEmptyBin}>
            <Trash2Icon className="size-3.5 mr-1.5" /> Empty Bin
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Search deleted files..."
          className="pl-8 h-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <Trash2Icon className="size-12 text-muted-foreground/20" />
          <p className="text-sm font-medium">Recycle bin is empty</p>
          <p className="text-xs">Deleted files will appear here</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs hidden sm:table-cell">Type</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Size</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Deleted</TableHead>
                <TableHead className="text-xs w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {getFileIcon(file.mimeType)}
                      <span className="font-medium text-sm truncate max-w-[200px]">{file.originalName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {getFileExtension(file.originalName).toUpperCase() || "FILE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatSize(file.size)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                    {file.deletedAt ? new Date(file.deletedAt).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleRestore(file.id)}
                        disabled={restoring === file.id}
                      >
                        <RotateCcwIcon className="size-3 mr-1" />
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => handlePermanentDelete(file.id)}
                        disabled={deleting === file.id}
                      >
                        <AlertTriangleIcon className="size-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
