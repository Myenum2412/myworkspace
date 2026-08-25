"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  FileIcon,
  ListTodoIcon,
  Loader2Icon,
  XCircleIcon,
} from "@/lib/icons";
import type { ApprovalItem } from "./columns";
import { DataTable } from "./data-table";

type Props = {
  items: ApprovalItem[];
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-gray-100 text-gray-700 border-gray-300",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

function getFileExtension(name?: string): string {
  if (!name) return "";
  const parts = name.split(".");
  if (parts.length <= 1) return "";
  const last = parts[parts.length - 1];
  return last ? last.toLowerCase() : "";
}

const CODE_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "rst",
  "log",
  "json",
  "jsonl",
  "jsonc",
  "csv",
  "tsv",
  "xml",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "env",
  "sql",
  "graphql",
  "gql",
  "js",
  "mjs",
  "cjs",
  "ts",
  "mts",
  "cts",
  "jsx",
  "tsx",
  "html",
  "htm",
  "css",
  "scss",
  "sass",
  "less",
  "py",
  "go",
  "rs",
  "c",
  "h",
  "cpp",
  "cs",
  "java",
  "kt",
  "swift",
  "rb",
  "php",
  "sh",
  "bash",
  "bat",
  "ps1",
  "diff",
  "patch",
];

function _typeForItem(item: ApprovalItem): string {
  if (item.itemType === "file") return "file";
  // Files are typically detected by a filename with a non-code extension.
  if (item.fileName) {
    const ext = getFileExtension(item.fileName);
    if (ext && ext !== "task" && !TYPE_EXTENSIONS.has(ext) && !CODE_EXTENSIONS.includes(ext))
      return "file";
  }
  return item.itemType || "task";
}

// Extensions strongly associated with binary files.
const TYPE_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "mp3",
  "mp4",
  "mov",
  "pdf",
]);

function TypeBadge({ item }: { item: ApprovalItem }) {
  if (typeOfItem(item) === "file") {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs font-medium">
        <FileIcon className="size-3 mr-1" />
        File
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs font-medium">Task</Badge>
  );
}

function typeOfItem(item: ApprovalItem): string {
  if (item.itemType === "file") return "file";
  if (item.fileName) {
    const ext = getFileExtension(item.fileName);
    if (ext && !CODE_EXTENSIONS.includes(ext)) return "file";
  }
  return "task";
}

function normalizeStatus(status: string): "pending" | "approved" | "rejected" {
  if (["done", "approved", "completed"].includes(status)) return "approved";
  if (["cancelled", "rejected"].includes(status)) return "rejected";
  return "pending";
}

function StatusBadge({ status }: { status: string }) {
  const norm = normalizeStatus(status);
  if (norm === "approved") {
    return (
      <Badge className="bg-green-100 text-green-700 text-xs font-medium">
        <CheckCircleIcon className="size-3 mr-1" />
        Approved
      </Badge>
    );
  }
  if (norm === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-700 text-xs font-medium">
        <XCircleIcon className="size-3 mr-1" />
        Rejected
      </Badge>
    );
  }
  return <Badge className="bg-yellow-100 text-yellow-700 text-xs font-medium">Pending</Badge>;
}

export default function ApprovalsClient({ items }: Props) {
  const [data, setData] = useState<ApprovalItem[]>(items);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [error, _setError] = useState("");

  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [actionItem, setActionItem] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const filtered = useMemo(() => {
    return data.filter((it) => {
      const n = normalizeStatus(it.status);
      if (statusFilter !== "all" && n !== statusFilter) return false;
      if (typeFilter !== "all" && typeOfItem(it) !== typeFilter) return false;
      return true;
    });
  }, [data, statusFilter, typeFilter]);

  function openView(item: ApprovalItem) {
    setSelectedItem(item);
    setViewOpen(true);
  }

  function openAction(item: ApprovalItem, type: "approve" | "reject") {
    setActionItem(item);
    setActionType(type);
    setActionNote("");
    setActionError("");
  }

  async function handleAction() {
    if (!actionItem || !actionType) return;
    if (actionType === "reject" && !actionNote.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }
    setActionError("");
    setActionSubmitting(true);

    try {
      let res: Response;
      const isFile = typeOfItem(actionItem) === "file";

      if (isFile && actionItem._id) {
        const endpoint =
          actionType === "approve"
            ? `/api/file-approval/${actionItem._id}/approve`
            : `/api/file-approval/${actionItem._id}/reject`;
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: actionType === "reject" ? JSON.stringify({ reason: actionNote }) : undefined,
        });
      } else if (!isFile && actionItem._id) {
        let body: Record<string, unknown> = {};
        if (actionType === "approve") {
          body = { status: "approved", approvalNote: actionNote || null };
        } else {
          body = { status: "rejected", rejectionReason: actionNote };
        }
        res = await fetch(`/api/tasks/${actionItem._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
      } else {
        res = new Response(JSON.stringify({ ok: false }), { status: 400 });
      }

      if (res.ok) {
        setData((prev) => {
          const target = prev.find((p) => p._id === actionItem._id);
          if (!target) return prev.filter((p) => p._id !== actionItem._id);
          target.status = actionType === "approve" ? "approved" : "rejected";
          if (actionType === "reject") target.rejectionReason = actionNote;
          return [...prev];
        });
        setActionItem(null);
        setActionType(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error || d.message || "Action failed. Try again.");
      }
    } catch {
      setActionItem(null);
      setActionType(null);
    } finally {
      setActionSubmitting(false);
    }
  }

  const _role: { [k: string]: ApprovalItem } = {};
  const selectedNorm = selectedItem ? normalizeStatus(selectedItem.status) : "";
  const isFileSelected = selectedItem ? typeOfItem(selectedItem) === "file" : false;

  const unifiedColumns: ColumnDef<ApprovalItem>[] = [
    {
      accessorKey: "title",
      header: "Item",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <TypeBadge item={row.original} />
          <div>
            <span className="font-medium text-sm">
              {row.getValue("title") || row.original.fileName || "—"}
            </span>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                {row.original.description}
              </p>
            )}
            {row.original.fileName && (
              <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
                {row.original.fileName}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => {
        if (typeOfItem(row.original) === "file")
          return <span className="text-xs text-muted-foreground">—</span>;
        const p = row.original.priority;
        return (
          <Badge
            variant="outline"
            className={`text-xs font-medium capitalize ${priorityColors[p] || ""}`}
          >
            {p || "—"}
          </Badge>
        );
      },
    },
    {
      id: "submittedBy",
      header: "Submitted By",
      cell: ({ row }) => {
        const item = row.original;
        const isFile = typeOfItem(item) === "file";
        const name = isFile
          ? item.uploaderName || item.assigneeName
          : item.assigneeName || item.assigneeId;
        const avatar = isFile ? item.uploaderAvatar : item.assigneeAvatar;
        if (!name) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 overflow-hidden">
              {avatar ? (
                // biome-ignore lint/performance/noImgElement: user avatar from auth provider
                <img src={avatar} alt={name} className="size-full object-cover" />
              ) : (
                <span>
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-sm font-medium truncate">{name}</span>
          </div>
        );
      },
    },
    {
      id: "approvedBy",
      header: "Approved By",
      cell: ({ row }) => {
        const item = row.original;
        const norm = normalizeStatus(item.status);
        if (norm !== "approved") return <span className="text-sm text-muted-foreground">—</span>;
        const name = item.approvedByName || item.approvedBy;
        const avatar = item.approvedByAvatar;
        if (!name) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="size-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0 overflow-hidden">
              {avatar ? (
                // biome-ignore lint/performance/noImgElement: user avatar from auth provider
                <img src={avatar} alt={name} className="size-full object-cover" />
              ) : (
                <span>
                  {name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              )}
            </div>
            <span className="text-sm font-medium truncate">{name}</span>
          </div>
        );
      },
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => {
        const isFile = typeOfItem(row.original) === "file";
        const val = isFile ? row.original.createdAt : row.original.dueDate;
        if (!val) return <span className="text-sm text-muted-foreground">—</span>;
        const date = new Date(val);
        const label = isFile ? "Uploaded" : "Due";
        return (
          <div>
            <span className="text-xs text-muted-foreground block">{label}</span>
            <span className="text-sm">
              {Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString()}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        const norm = normalizeStatus(item.status);
        if (norm === "pending") {
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="text-xs bg-green-500 hover:bg-green-700 touch-target"
                onClick={(e) => {
                  e.stopPropagation();
                  openAction(item, "approve");
                }}
              >
                <CheckCircleIcon className="size-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-black border-blue-200 hover:bg-blue-100 touch-target"
                onClick={(e) => {
                  e.stopPropagation();
                  openAction(item, "reject");
                }}
              >
                <XCircleIcon className="size-3 mr-1" />
                Reject
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end pr-1">
            {norm === "approved" ? (
              <span className="inline-flex items-center text-xs text-green-600">
                <CheckIcon className="size-3.5 mr-1" />
                {item.approvedBy || "Approved"}
              </span>
            ) : (
              <span className="inline-flex items-center text-xs text-red-600">
                <XCircleIcon className="size-3.5 mr-1" />
                {item.rejectedBy || "Rejected"}
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3 min-w-0 shrink-0">
            <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ListTodoIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold leading-tight">Approvals</h1>
              <p className="text-xs text-muted-foreground truncate">
                Approve, review and filter pending, approved and rejected items.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 h-10 text-sm shrink-0">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 h-10 text-sm shrink-0">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="file">Files</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== "all" || typeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0 underline-offset-2 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Results summary */}
        {(statusFilter !== "all" || typeFilter !== "all") && (
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            {items.length} items
          </p>
        )}

        {error ? (
          <div className="flex items-center justify-center py-12 text-destructive">{error}</div>
        ) : (
          <DataTable
            columns={unifiedColumns}
            data={filtered}
            onRowClick={openView}
            emptyMessage="No approvals match the current filters."
          />
        )}
      </main>

      {/* View Detail Dialog */}
      <Dialog
        open={viewOpen}
        onOpenChange={(o) => {
          if (!o) {
            setViewOpen(false);
            setSelectedItem(null);
          }
        }}
      >
        <DialogContent className="p-0 flex flex-col max-w-xl" showCloseButton={false}>
          {selectedItem && (
            <>
              <div className="relative shrink-0 overflow-hidden rounded-t-lg border-b bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-4 sm:px-6 pt-4 sm:pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedNorm === "rejected"
                          ? "bg-red-100 text-red-600"
                          : selectedNorm === "approved"
                            ? "bg-green-100 text-green-600"
                            : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {isFileSelected ? (
                        <FileIcon className="size-5" />
                      ) : (
                        <ListTodoIcon className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-base sm:text-lg font-bold leading-snug truncate">
                        {selectedItem.title || selectedItem.fileName}
                      </DialogTitle>
                      <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                        {isFileSelected
                          ? "File upload details for approval review"
                          : "Task details for approval review"}
                      </DialogDescription>
                    </div>
                  </div>
                  <StatusBadge status={selectedItem.status} />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {(selectedItem.description || selectedItem.fileName) && (
                  <div className="rounded-lg border bg-card px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {isFileSelected ? "File Name" : "Description"}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {isFileSelected ? selectedItem.fileName : selectedItem.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border bg-card px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">Type</p>
                    <p className="font-medium capitalize mt-0.5">
                      {isFileSelected ? "file" : "task"}
                    </p>
                  </div>
                  {!isFileSelected && (
                    <div className="rounded-lg border bg-card px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Priority</p>
                      <p className="font-medium capitalize mt-0.5">
                        {selectedItem.priority || "—"}
                      </p>
                    </div>
                  )}
                  <div className="rounded-lg border bg-card px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      {isFileSelected ? "Uploaded By" : "Assignee"}
                    </p>
                    <p className="font-medium mt-0.5 truncate">
                      {(isFileSelected
                        ? selectedItem.uploaderName
                        : selectedItem.assigneeName || selectedItem.assigneeId) || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2.5">
                    <p className="text-[11px] text-muted-foreground">
                      {isFileSelected ? "Uploaded At" : "Due Date"}
                    </p>
                    <p className="font-medium mt-0.5">
                      {(() => {
                        const dateVal = isFileSelected
                          ? selectedItem.createdAt
                          : selectedItem.dueDate;
                        return dateVal ? new Date(dateVal).toLocaleDateString() : "—";
                      })()}
                    </p>
                  </div>
                  {!isFileSelected && selectedItem.creatorName && (
                    <div className="rounded-lg border bg-card px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Creator</p>
                      <p className="font-medium mt-0.5 truncate">{selectedItem.creatorName}</p>
                    </div>
                  )}
                  {isFileSelected && selectedItem.mimeType && (
                    <div className="rounded-lg border bg-card px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">File Type</p>
                      <p className="font-medium mt-0.5">{selectedItem.mimeType}</p>
                    </div>
                  )}
                  {selectedNorm !== "pending" && selectedItem.approvedBy && (
                    <div className="rounded-lg border bg-card px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Approved By</p>
                      <p className="font-medium mt-0.5 truncate">{selectedItem.approvedBy}</p>
                    </div>
                  )}
                  {selectedNorm === "rejected" && (
                    <div className="rounded-lg border bg-card px-3 py-2.5">
                      <p className="text-[11px] text-muted-foreground">Rejected At</p>
                      <p className="font-medium mt-0.5">
                        {selectedItem.rejectedAt
                          ? new Date(selectedItem.rejectedAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  )}
                </div>
                {selectedNorm === "rejected" && selectedItem.rejectionReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-red-700 mb-1">
                      Rejection Reason
                    </p>
                    <p className="text-sm text-red-800">{selectedItem.rejectionReason}</p>
                  </div>
                )}
                {selectedNorm === "approved" && selectedItem.approvalNote && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-green-700 mb-1">
                      Approval Note
                    </p>
                    <p className="text-sm text-green-800">{selectedItem.approvalNote}</p>
                  </div>
                )}
              </div>

              <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewOpen(false);
                    setSelectedItem(null);
                  }}
                  className="h-10 w-full sm:w-auto min-w-28 touch-target"
                >
                  Close
                </Button>
                {selectedNorm === "pending" && (
                  <>
                    <Button
                      className="bg-green-500 hover:bg-green-700 h-10 w-full sm:w-auto min-w-32 touch-target"
                      onClick={() => {
                        setViewOpen(false);
                        openAction(selectedItem, "approve");
                      }}
                    >
                      <CheckCircleIcon className="size-3.5 mr-1.5" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-black border-blue-200 hover:bg-blue-100 h-10 w-full sm:w-auto min-w-32 touch-target"
                      onClick={() => {
                        setViewOpen(false);
                        openAction(selectedItem, "reject");
                      }}
                    >
                      <XCircleIcon className="size-3.5 mr-1.5" />
                      Reject
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog
        open={!!actionItem}
        onOpenChange={(o) => {
          if (!o) {
            setActionItem(null);
            setActionType(null);
            setActionNote("");
            setActionError("");
          }
        }}
      >
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {actionType === "approve" ? (
                <CheckCircleIcon className="size-4 sm:size-5 text-success" />
              ) : (
                <XCircleIcon className="size-4 sm:size-5 text-destructive" />
              )}
              {actionType === "approve" ? "Approve" : "Reject"}{" "}
              {actionItem && typeOfItem(actionItem) === "file" ? "File Upload" : "Task"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Confirm approval for "${actionItem?.title}"`
                : `Provide a reason for rejecting "${actionItem?.title}"`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="mx-4 sm:mx-6 flex items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {actionError}
            </div>
          )}

          <div className="px-4 sm:px-6 py-3 space-y-3">
            {actionType === "reject" && (
              <div>
                <Label className="text-xs text-muted-foreground">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={3}
                  className="mt-1 flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
            {actionType === "approve" && (
              <div>
                <Label className="text-xs text-muted-foreground">Approval Note (optional)</Label>
                <Textarea
                  id="note"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  className="mt-1 flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setActionItem(null);
                setActionType(null);
                setActionNote("");
                setActionError("");
              }}
              disabled={actionSubmitting}
              className="touch-target"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionSubmitting}
              className={`touch-target ${actionType === "approve" ? "bg-green-500 hover:bg-green-700" : "bg-blue-300 hover:bg-blue-400"}`}
            >
              {actionSubmitting ? (
                <Loader2Icon className="animate-spin" />
              ) : actionType === "approve" ? (
                <>
                  <CheckCircleIcon className="size-3.5 mr-1.5" /> Confirm Approve
                </>
              ) : (
                <>
                  <XCircleIcon className="size-3.5 mr-1.5" /> Confirm Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
