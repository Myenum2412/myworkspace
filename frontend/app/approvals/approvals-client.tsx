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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  CheckIcon,
  FileIcon,
  ListTodoIcon,
  Loader2Icon,
  SearchIcon,
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
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
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

function typeForItem(item: ApprovalItem): string {
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
  if (status === "done" || status === "approved") return "approved";
  if (status === "cancelled" || status === "rejected") return "rejected";
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
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [actionItem, setActionItem] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, file: 0, task: 0 };
    for (const it of items) {
      const n = normalizeStatus(it.status);
      if (n === "pending" || n === "approved" || n === "rejected") c[n]++;
      typeOfItem(it) === "file" ? c.file++ : c.task++;
    }
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((it) => {
      const n = normalizeStatus(it.status);
      if (statusFilter !== "all" && n !== statusFilter) return false;
      if (typeFilter !== "all" && typeOfItem(it) !== typeFilter) return false;
      if (q) {
        const haystack = [
          it.title,
          it.fileName,
          it.assigneeName,
          it.uploaderName,
          it.creatorName,
          it.description,
          it.priority,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [data, statusFilter, typeFilter, search]);

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

  const role: { [k: string]: ApprovalItem } = {};
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
        const name =
          typeOfItem(row.original) === "file"
            ? row.original.uploaderName || row.original.assigneeName
            : row.original.assigneeName || row.original.assigneeId;
        return name ? (
          <span className="text-sm">{name}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
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
              {isNaN(date.getTime()) ? "—" : date.toLocaleDateString()}
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
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                className="text-xs bg-green-500 hover:bg-green-700 touch-target"
                onClick={() => openAction(item, "approve")}
              >
                <CheckCircleIcon className="size-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs text-black border-blue-200 hover:bg-blue-100 touch-target"
                onClick={() => openAction(item, "reject")}
              >
                <XCircleIcon className="size-3 mr-1" />
                Reject
              </Button>
            </div>
          );
        }
        return (
          <div className="flex items-center justify-end pr-1" onClick={(e) => e.stopPropagation()}>
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

  const filterButton = (value: string, label: string, count: number) => {
    const active = statusFilter === value;
    return (
      <button
        key={value}
        onClick={() => setStatusFilter(value)}
        className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors touch-target ${
          active
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:bg-muted"
        }`}
      >
        {label}
        <span
          className={`ml-1.5 ${active ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Approvals</h1>
            <p className="text-xs text-muted-foreground">
              Approve, review and filter pending, approved and rejected items.
            </p>
          </div>
          <Badge variant="secondary" className="sm:ml-auto shrink-0 self-start sm:self-center">
            {items.length} total
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3">
          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterButton("all", "All", items.length)}
            {filterButton("pending", "Pending Approvals", counts.pending)}
            {filterButton("approved", "Approved", counts.approved)}
            {filterButton("rejected", "Rejected", counts.rejected)}
          </div>

          {/* Search + type filter row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, assignee, priority…"
                className="pl-8 h-9 text-sm"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-40 h-9 text-sm shrink-0">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
                <SelectItem value="file">Files</SelectItem>
              </SelectContent>
            </Select>
            {(search || statusFilter !== "all" || typeFilter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
                className="text-xs text-muted-foreground hover:text-foreground shrink-0 underline-offset-2 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results summary */}
        {(search || statusFilter !== "all" || typeFilter !== "all") && (
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
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedItem && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {isFileSelected ? (
                    <FileIcon className="size-4 sm:size-5" />
                  ) : (
                    <ListTodoIcon className="size-4 sm:size-5" />
                  )}
                  {selectedItem.title || selectedItem.fileName}
                </DialogTitle>
                <DialogDescription>
                  {isFileSelected
                    ? "File upload details for approval review."
                    : "Task details for approval review."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-4">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedItem.status} />
                </div>
                {(selectedItem.description || selectedItem.fileName) && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      {isFileSelected ? "File Name" : "Description"}
                    </p>
                    <p className="text-sm">
                      {isFileSelected ? selectedItem.fileName : selectedItem.description}
                    </p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-sm border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Type</p>
                    <p className="font-medium capitalize mt-0.5">
                      {isFileSelected ? "file" : "task"}
                    </p>
                  </div>
                  {!isFileSelected && (
                    <div className="rounded-sm border bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Priority</p>
                      <p className="font-medium capitalize mt-0.5">
                        {selectedItem.priority || "—"}
                      </p>
                    </div>
                  )}
                  <div className="rounded-sm border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      {isFileSelected ? "Uploaded By" : "Assignee"}
                    </p>
                    <p className="font-medium mt-0.5">
                      {(isFileSelected
                        ? selectedItem.uploaderName
                        : selectedItem.assigneeName || selectedItem.assigneeId) || "—"}
                    </p>
                  </div>
                  <div className="rounded-sm border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">
                      {isFileSelected ? "Uploaded At" : "Due Date"}
                    </p>
                    <p className="font-medium mt-0.5">
                      {(isFileSelected ? selectedItem.createdAt : selectedItem.dueDate)
                        ? new Date(
                            (isFileSelected ? selectedItem.createdAt : selectedItem.dueDate)!,
                          ).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  {!isFileSelected && selectedItem.creatorName && (
                    <div className="rounded-sm border bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Creator</p>
                      <p className="font-medium mt-0.5">{selectedItem.creatorName}</p>
                    </div>
                  )}
                  {isFileSelected && selectedItem.mimeType && (
                    <div className="rounded-sm border bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">File Type</p>
                      <p className="font-medium mt-0.5">{selectedItem.mimeType}</p>
                    </div>
                  )}
                  {selectedNorm !== "pending" && selectedItem.approvedBy && (
                    <div className="rounded-sm border bg-card px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">Approved By</p>
                      <p className="font-medium mt-0.5">{selectedItem.approvedBy}</p>
                    </div>
                  )}
                  {selectedNorm === "rejected" && (
                    <div className="rounded-sm border bg-card px-3 py-2">
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
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Rejection Reason
                      </p>
                      <p className="text-sm">{selectedItem.rejectionReason}</p>
                    </div>
                  </>
                )}
                {selectedNorm === "approved" && selectedItem.approvalNote && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                        Approval Note
                      </p>
                      <p className="text-sm">{selectedItem.approvalNote}</p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewOpen(false);
                    setSelectedItem(null);
                  }}
                  className="touch-target"
                >
                  Close
                </Button>
                {selectedNorm === "pending" && (
                  <>
                    <Button
                      className="bg-green-500 hover:bg-green-700 touch-target"
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
                      className="text-black border-blue-200 hover:bg-blue-100 touch-target"
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
