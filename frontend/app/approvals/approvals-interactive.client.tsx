"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ClockIcon, Loader2Icon, CheckCircleIcon, XCircleIcon, ListTodoIcon, AlertCircleIcon } from "lucide-react";
import { DataTable } from "./data-table";
import { pendingColumns, type ApprovalTask } from "./columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface ApprovalsInteractiveProps {
  initialTasks: ApprovalTask[];
}

export default function ApprovalsInteractive({ initialTasks }: ApprovalsInteractiveProps) {
  const [pending, setPending] = useState<ApprovalTask[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [actionTask, setActionTask] = useState<ApprovalTask | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  function openView(task: ApprovalTask) {
    setSelectedTask(task);
    setViewOpen(true);
  }

  function openAction(task: ApprovalTask, type: "approve" | "reject") {
    setActionTask(task);
    setActionType(type);
    setActionNote("");
    setActionError("");
  }

  async function handleAction() {
    if (!actionTask || !actionType) return;
    if (actionType === "reject" && !actionNote.trim()) {
      setActionError("A rejection reason is required.");
      return;
    }
    setActionError("");
    setActionSubmitting(true);

    let body: any = {};
    if (actionTask.status === "postponed") {
      body = actionType === "approve"
        ? { status: "postponed", approvalNote: actionNote || "Approved postponement" }
        : { status: "in_progress", rejectionReason: actionNote };
    } else {
      // Default for "review"
      body = actionType === "approve"
        ? { status: "done", approvalNote: actionNote || null }
        : { status: "cancelled", rejectionReason: actionNote };
    }

    try {
      const res = await fetch(`/api/tasks/${actionTask._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setPending((prev) => prev.filter((t) => t._id !== actionTask._id));
        setActionTask(null);
        setActionType(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setActionError(d.error || "Action failed. Try again.");
      }
    } catch {
      setPending((prev) => prev.filter((t) => t._id !== actionTask._id));
      setActionTask(null);
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
      cell: ({ row }: { row: { original: ApprovalTask } }) => {
        const task = row.original;
        return (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="sm" className="text-xs bg-green-500 hover:bg-green-700 touch-target" onClick={() => openAction(task, "approve")}>
              <CheckCircleIcon className="size-3 mr-1" />Approve
            </Button>
            <Button size="sm" variant="outline" className="text-xs text-black border-blue-200 hover:bg-blue-100 touch-target" onClick={() => openAction(task, "reject")}>
              <XCircleIcon className="size-3 mr-1" />Reject
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-6 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Pending Approvals</h1>
          <Badge variant="secondary" className="ml-auto shrink-0">{pending.length} pending</Badge>
        </div>

        <Card>
          <CardHeader><CardTitle>Tasks awaiting review</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
            ) : error ? (
              <div className="flex items-center justify-center py-12 text-red-500">{error}</div>
            ) : (
              <DataTable columns={actionColumns} data={pending} onRowClick={openView} emptyMessage="No tasks pending approval." />
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedTask && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg"><ListTodoIcon className="size-4 sm:size-5" />{selectedTask.title}</DialogTitle>
                <DialogDescription>Task details for approval review.</DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 space-y-4">
                {selectedTask.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedTask.description}</p>
                  </div>
                )}
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Priority</p><p className="font-medium capitalize mt-0.5">{selectedTask.priority}</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Status</p><p className="font-medium capitalize mt-0.5">Review</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Assignee</p><p className="font-medium mt-0.5">{selectedTask.assigneeName || "—"}</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Due Date</p><p className="font-medium mt-0.5">{selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "—"}</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Creator</p><p className="font-medium mt-0.5">{selectedTask.creatorName || "—"}</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Created</p><p className="font-medium mt-0.5">{selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "—"}</p></div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
                <Button variant="outline" onClick={() => { setViewOpen(false); setSelectedTask(null); }} className="w-full sm:w-auto touch-target">Close</Button>
                <Button className="bg-green-500 hover:bg-green-700 w-full sm:w-auto touch-target" onClick={() => { setViewOpen(false); openAction(selectedTask, "approve"); }}><CheckCircleIcon className="size-3.5 mr-1.5" />Approve</Button>
                <Button variant="outline" className="text-black border-blue-200 hover:bg-blue-100 w-full sm:w-auto touch-target" onClick={() => { setViewOpen(false); openAction(selectedTask, "reject"); }}><XCircleIcon className="size-3.5 mr-1.5" />Reject</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionTask} onOpenChange={(o) => { if (!o) { setActionTask(null); setActionType(null); setActionNote(""); setActionError(""); } }}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {actionType === "approve" ? <CheckCircleIcon className="size-4 sm:size-5 text-success" /> : <XCircleIcon className="size-4 sm:size-5 text-destructive" />}
              {actionType === "approve" ? "Approve Task" : "Reject Task"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve" ? `Confirm approval for "${actionTask?.title}"` : `Provide a reason for rejecting "${actionTask?.title}"`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="mx-4 sm:mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />{actionError}
            </div>
          )}

          <div className="px-4 sm:px-6 py-3 space-y-3">
            {actionType === "reject" && (
              <div>
                <Label htmlFor="reason" className="text-sm">Rejection Reason *</Label>
                <Textarea id="reason" value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="" rows={3} className="mt-1" />
              </div>
            )}
            {actionType === "approve" && (
              <div>
                <Label htmlFor="note" className="text-sm">Approval Note (optional)</Label>
                <Textarea id="note" value={actionNote} onChange={(e) => setActionNote(e.target.value)} placeholder="" rows={2} className="mt-1" />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4 gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => { setActionTask(null); setActionType(null); setActionNote(""); setActionError(""); }} disabled={actionSubmitting} className="w-full sm:w-auto touch-target">Cancel</Button>
            <Button onClick={handleAction} disabled={actionSubmitting} className={`w-full sm:w-auto touch-target ${actionType === "approve" ? "bg-green-500 hover:bg-green-700" : "bg-blue-300 hover:bg-blue-400"}`}>
              {actionSubmitting ? <Loader2Icon className="size-4 animate-spin" /> : actionType === "approve" ? <><CheckCircleIcon className="size-3.5 mr-1.5" /> Confirm Approve</> : <><XCircleIcon className="size-3.5 mr-1.5" /> Confirm Reject</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
