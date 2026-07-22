"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/file-system/use-file-data";
import { type AuditLogEntry } from "@/lib/file-system/types";
import {
  HistoryIcon,
  SearchIcon,
  DownloadIcon,
  FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  Trash2Icon,
  Share2Icon,
  UploadIcon,
  RotateCcwIcon,
  PencilIcon,
  UserIcon,
  LockIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const actionIcons: Record<string, React.ReactNode> = {
  "folder_created": <FolderIcon className="size-3.5 text-blue-500" />,
  "folder_renamed": <PencilIcon className="size-3.5 text-yellow-500" />,
  "folder_deleted": <Trash2Icon className="size-3.5 text-red-500" />,
  "folder_restored": <RotateCcwIcon className="size-3.5 text-green-500" />,
  "file_uploaded": <UploadIcon className="size-3.5 text-green-500" />,
  "file_downloaded": <DownloadIcon className="size-3.5 text-blue-500" />,
  "file_shared": <Share2Icon className="size-3.5 text-purple-500" />,
  "file_deleted": <Trash2Icon className="size-3.5 text-red-500" />,
  "file_restored": <RotateCcwIcon className="size-3.5 text-green-500" />,
  "file_renamed": <PencilIcon className="size-3.5 text-yellow-500" />,
  "permission_changed": <LockIcon className="size-3.5 text-orange-500" />,
};

function getActionLabel(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function AuditLogView() {
  const { data: logs, isLoading, refetch } = useAuditLogs();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const perPage = 25;

  const filtered = (logs || []).filter((log) => {
    if (search && !log.description?.toLowerCase().includes(search.toLowerCase()) && !log.userName?.toLowerCase().includes(search.toLowerCase())) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const actionTypes = Array.from(new Set(logs?.map((l) => l.action) || []));

  async function handleExport(format: "csv" | "pdf") {
    const rows = filtered.map((log) => ({
      User: log.userName || "",
      Role: log.userRole || "",
      Action: getActionLabel(log.action),
      Description: log.description,
      Timestamp: new Date(log.createdAt).toLocaleString(),
      Status: log.status || "success",
    }));
    if (format === "csv") {
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${(r as Record<string, string>)[h]}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      window.open(url);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <HistoryIcon className="size-4" /> Audit Log
          </h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== (logs?.length || 0) && <> (filtered from {(logs?.length || 0)})</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
            <DownloadIcon className="size-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search audit log..."
            className="pl-8 h-9 bg-white"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actionTypes.map((action) => (
              <SelectItem key={action} value={action}>{getActionLabel(action)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paged.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <HistoryIcon className="size-12 text-muted-foreground/20" />
          <p className="text-sm font-medium">No audit events found</p>
          <p className="text-xs">File operations will be logged here</p>
        </div>
      ) : (
        <>
          <div className="border rounded-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-8" />
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs hidden sm:table-cell">User</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Description</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Timestamp</TableHead>
                  <TableHead className="text-xs w-16">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{actionIcons[log.action] || <FileIcon className="size-3.5 text-muted-foreground" />}</TableCell>
                    <TableCell className="text-xs font-medium">{getActionLabel(log.action)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                      {log.userName || log.userId}
                      {log.userRole && <Badge variant="outline" className="ml-1.5 text-[9px]">{log.userRole}</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[300px] truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.status === "failed" ? "destructive" : "secondary"} className="text-[9px]">
                        {log.status || "success"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeftIcon className="size-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRightIcon className="size-3.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
