"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2Icon, CheckCircleIcon, XCircleIcon, ListTodoIcon, AlertCircleIcon, FileIcon } from "lucide-react";
import { DataTable } from "./data-table";
import { pendingColumns, type ApprovalItem } from "./columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ApprovalsInteractiveProps {
  initialItems: ApprovalItem[];
}

export default function ApprovalsInteractive({ initialItems }: ApprovalsInteractiveProps) {
  const [pending, setPending] = useState<ApprovalItem[]>(initialItems);
  const [error, setError] = useState("");

  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [actionItem, setActionItem] = useState<ApprovalItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

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

      if (actionItem.itemType === "file") {
        // File approval via backend API
        const endpoint = actionType === "approve"
          ? `/api/file-approval/${actionItem._id}/approve`
          : `/api/file-approval/${actionItem._id}/reject`;
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: actionType === "reject" ? JSON.stringify({ reason: actionNote }) : undefined,
        });
      } else {
        // Task approval via existing task API
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
      }

      if (res.ok) {
        setPending((prev) => prev.filter((item) => item._id !== actionItem._id));
        setActionItem(null);
        setActionType(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error || d.message || "Action failed. Try again.");
      }
    } catch {
      setPending((prev) => prev.filter((item) => item._id !== actionItem._id));
      setActionItem(null);
      setActionType(null);
    } finally {
      setActionSubmitting(false);
    }
  }

  const actionColumns = [
    ...pendingColumns,
    {
      id: "actions",
      header: "",
      cell: ({ row }: { row: { original: ApprovalItem } }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="text-xs bg-green-500 hover:bg-green-700 touch-target" onClick={() => openAction(item, "approve")}>
              <CheckCircleIcon className="size-3 mr-1" />Approve
            </Button>
            <Button size="sm" variant="outline" className="text-xs text-black border-blue-200 hover:bg-blue-100 touch-target" onClick={() => openAction(item, "reject")}>
              <XCircleIcon className="size-3 mr-1" />Reject
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  const isFile = selectedItem?.itemType === "file";
  const hasNotifications = pending.length > 0;

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center gap-2">
          {hasNotifications ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M3.124 7.5A8.969 8.969 0 0 1 5.292 3m13.416 0a8.969 8.969 0 0 1 2.168 4.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          )}
          <h1 className="text-xl sm:text-2xl font-bold">Pending Approvals</h1>
          <Badge variant="secondary" className="ml-auto shrink-0">{pending.length} pending</Badge>
        </div>

        {error ? (
          <div className="flex items-center justify-center py-12 text-destructive">{error}</div>
        ) : (
          <DataTable columns={actionColumns} data={pending} onRowClick={openView} emptyMessage="No items pending approval." />
        )}
      </main>

      {/* View Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setSelectedItem(null); } }}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedItem && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {isFile ? <FileIcon className="size-4 sm:size-5" /> : <ListTodoIcon className="size-4 sm:size-5" />}
                  {selectedItem.title}
                </DialogTitle>
                <DialogDescription>{isFile ? "File upload details for approval review." : "Task details for approval review."}</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-4">
                {(selectedItem.description || selectedItem.fileName) && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{isFile ? "File Name" : "Description"}</p>
                    <p className="text-sm">{isFile ? selectedItem.fileName : selectedItem.description}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Type</p><p className="font-medium capitalize mt-0.5">{selectedItem.itemType}</p></div>
                  {!isFile && (
                    <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Priority</p><p className="font-medium capitalize mt-0.5">{selectedItem.priority}</p></div>
                  )}
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Status</p><p className="font-medium capitalize mt-0.5">Review</p></div>
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">{isFile ? "Uploaded By" : "Assignee"}</p><p className="font-medium mt-0.5">{(isFile ? selectedItem.uploaderName : selectedItem.assigneeName) || "—"}</p></div>
                  <div className="rounded-sm border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">{isFile ? "Uploaded At" : "Due Date"}</p>
                    <p className="font-medium mt-0.5">
                      {(isFile ? selectedItem.createdAt : selectedItem.dueDate)
                        ? new Date((isFile ? selectedItem.createdAt : selectedItem.dueDate)!).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  {!isFile && selectedItem.creatorName && (
                    <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Creator</p><p className="font-medium mt-0.5">{selectedItem.creatorName}</p></div>
                  )}
                  {isFile && selectedItem.mimeType && (
                    <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">File Type</p><p className="font-medium mt-0.5">{selectedItem.mimeType}</p></div>
                  )}
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
                <Button variant="outline" onClick={() => { setViewOpen(false); setSelectedItem(null); }} className="w-full sm:w-auto touch-target">Close</Button>
                <Button className="bg-green-500 hover:bg-green-700 w-full sm:w-auto touch-target" onClick={() => { setViewOpen(false); openAction(selectedItem, "approve"); }}><CheckCircleIcon className="size-3.5 mr-1.5" />Approve</Button>
                <Button variant="outline" className="text-black border-blue-200 hover:bg-blue-100 w-full sm:w-auto touch-target" onClick={() => { setViewOpen(false); openAction(selectedItem, "reject"); }}><XCircleIcon className="size-3.5 mr-1.5" />Reject</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={!!actionItem} onOpenChange={(o) => { if (!o) { setActionItem(null); setActionType(null); setActionNote(""); setActionError(""); } }}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {actionType === "approve" ? <CheckCircleIcon className="size-4 sm:size-5 text-success" /> : <XCircleIcon className="size-4 sm:size-5 text-destructive" />}
              {actionType === "approve" ? "Approve" : "Reject"} {actionItem?.itemType === "file" ? "File Upload" : "Task"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Confirm approval for "${actionItem?.title}"`
                : `Provide a reason for rejecting "${actionItem?.title}"`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="mx-4 sm:mx-6 flex items-center gap-2 rounded-sm bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />{actionError}
            </div>
          )}

          <div className="px-4 sm:px-6 py-3 space-y-3">
            {actionType === "reject" && (
              <div>
                <Label className="text-xs text-muted-foreground">Rejection Reason *</Label>
                <Textarea id="reason" value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="" rows={3} className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
            )}
            {actionType === "approve" && (
              <div>
                <Label className="text-xs text-muted-foreground">Approval Note (optional)</Label>
                <Textarea id="note" value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="" rows={2} className="flex w-full rounded-sm border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setActionItem(null); setActionType(null); setActionNote(""); setActionError(""); }} disabled={actionSubmitting} className="w-full sm:w-auto touch-target">Cancel</Button>
            <Button onClick={handleAction} disabled={actionSubmitting} className={`w-full sm:w-auto touch-target ${actionType === "approve" ? "bg-green-500 hover:bg-green-700" : "bg-blue-300 hover:bg-blue-400"}`}>
              {actionSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : actionType === "approve" ? <><CheckCircleIcon className="size-3.5 mr-1.5" /> Confirm Approve</> : <><XCircleIcon className="size-3.5 mr-1.5" /> Confirm Reject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
