"use client";

import { useState, useMemo } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EyeIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FileIcon,
} from "lucide-react";
import { DataTable } from "@/components/data-table";
import { type ColumnDef } from "@tanstack/react-table";
import type { FileItem } from "@/lib/file-system/types";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
          <CheckCircleIcon className="size-3 mr-1" /> Approved
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800">
          <XCircleIcon className="size-3 mr-1" /> Rejected
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800">
          <ClockIcon className="size-3 mr-1" /> Pending
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800">
          None
        </Badge>
      );
  }
}

function FileThumbnail({ file }: { file: FileItem }) {
  const [error, setError] = useState(false);

  if (file.mimeType.startsWith("image/") && !error) {
    return (
      <img
        src={`/api/files/thumbnail/${file.id}?size=small`}
        alt={file.originalName}
        className="size-8 rounded-sm object-cover shrink-0"
        loading="lazy"
        onError={() => setError(true)}
      />
    );
  }

  return <>{getFileIcon(file.mimeType)}</>;
}

function FileActionsDropdown({ file }: { file: FileItem }) {
  const setPreviewFile = useFileSystemStore((s) => s.setPreviewFile);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <MoreHorizontalIcon className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => setPreviewFile(file)}>
          <EyeIcon className="size-3.5 mr-2" /> Preview
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.open(`/api/files/${file.id}/download`, "_blank")}>
          <DownloadIcon className="size-3.5 mr-2" /> Download
        </DropdownMenuItem>
        {file.approvalNote && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <p className="text-xs text-muted-foreground font-medium">Note</p>
              <p className="text-xs text-muted-foreground">{file.approvalNote}</p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ApprovalFileTable({ files, status }: { files: FileItem[]; status: string }) {
  const setPreviewFile = useFileSystemStore((s) => s.setPreviewFile);

  const columns: ColumnDef<FileItem, unknown>[] = useMemo(() => [
    {
      id: "name",
      header: "File Name",
      accessorFn: (row) => row.originalName,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <FileThumbnail file={row.original} />
          <span className="font-medium truncate max-w-[300px]">{row.original.originalName}</span>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      accessorFn: (row) => row.mimeType.split("/").pop()?.toUpperCase() || "FILE",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "size",
      header: "Size",
      accessorFn: (row) => row.size,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{formatSize(getValue() as number)}</span>
      ),
    },
    {
      id: "uploader",
      header: "Uploaded By",
      accessorFn: (row) => row.uploaderName || "—",
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{getValue() as string}</span>
      ),
    },
    {
      id: "date",
      header: "Date",
      accessorFn: (row) => row.createdAt,
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">
          {getValue() ? new Date(getValue() as string).toLocaleDateString() : "—"}
        </span>
      ),
    },
    ...(status === "rejected"
      ? [
          {
            id: "note",
            header: "Reason",
            accessorFn: (row: FileItem) => row.approvalNote || "—",
            cell: ({ getValue }: { getValue: () => unknown }) => (
              <span className="text-muted-foreground truncate max-w-[200px]">{getValue() as string}</span>
            ),
          } as ColumnDef<FileItem, unknown>,
        ]
      : []),
    {
      id: "actions",
      header: "",
      cell: ({ row }) => <FileActionsDropdown file={row.original} />,
    },
  ], [status]);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <FileIcon className="size-12 text-muted-foreground/20" />
        <p className="text-sm">No {status} files</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={files}
      onRowClick={(file) => setPreviewFile(file)}
      searchPlaceholder={`Search ${status} files...`}
      emptyMessage={`No ${status} files found.`}
      showCheckboxes={false}
      pageSize={15}
    />
  );
}

export function ApprovalFilesView() {
  const files = useFileSystemStore((s) => s.files);

  const pendingFiles = useMemo(
    () => files.filter((f) => f.approvalStatus === "pending"),
    [files]
  );
  const approvedFiles = useMemo(
    () => files.filter((f) => f.approvalStatus === "approved"),
    [files]
  );
  const rejectedFiles = useMemo(
    () => files.filter((f) => f.approvalStatus === "rejected"),
    [files]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">File Approvals</h2>
          <p className="text-sm text-muted-foreground">Review and manage file approval status</p>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="border-b border-border rounded-b-none justify-start w-full bg-transparent h-auto p-0 gap-1 max-h-10! *:flex-none">
          <TabsTrigger value="pending" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">
            Pending
            {pendingFiles.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{pendingFiles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">
            Approved
            {approvedFiles.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{approvedFiles.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-2">
            Rejected
            {rejectedFiles.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">{rejectedFiles.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <ApprovalFileTable files={pendingFiles} status="pending" />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <ApprovalFileTable files={approvedFiles} status="approved" />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <ApprovalFileTable files={rejectedFiles} status="rejected" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
