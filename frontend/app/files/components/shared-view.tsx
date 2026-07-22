"use client";

import { useSharedFiles } from "@/hooks/file-system/use-file-data";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import { DownloadIcon, Share2Icon, UserIcon, ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function SharedWithMe() {
  const { data: shares, isLoading, refetch } = useSharedFiles();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!shares || shares.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Share2Icon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No files shared with you</p>
        <p className="text-xs">When someone shares a file with you, it will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Share2Icon className="size-4" /> Shared with Me
        </h2>
        <p className="text-sm text-muted-foreground">{shares.length} shared file{shares.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="border rounded-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">File</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Shared by</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Size</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Date</TableHead>
              <TableHead className="text-xs w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shares.map((share) => (
              <TableRow key={share.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {share.file ? getFileIcon(share.file.mimeType) : <Share2Icon className="size-4" />}
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {share.file?.originalName || "Unknown file"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="size-3" />
                    {share.sharedWithName || share.sharedByUserId}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {share.file ? formatSize(share.file.size) : "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="size-3" />
                    {new Date(share.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => share.file && window.open(`/api/files/${share.file.id}/download`, "_blank")}
                    >
                      <DownloadIcon className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
