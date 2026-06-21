"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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

const FAKE_TASKS: ApprovalTask[] = [
  { _id: "1", title: "Design new dashboard layout", description: "Create wireframes for the main dashboard", status: "in_progress", priority: "high", dueDate: "2026-07-01T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", creatorId: "u2", creatorName: "Bob Martinez", createdAt: "2026-06-10T00:00:00Z" },
  { _id: "2", title: "Implement user authentication", description: "Set up OAuth and session management", status: "todo", priority: "urgent", dueDate: "2026-06-28T00:00:00Z", assigneeId: "u3", assigneeName: "Carol Williams", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-08T00:00:00Z" },
  { _id: "3", title: "API integration for payment gateway", description: "Connect Stripe for subscription billing", status: "review", priority: "high", dueDate: "2026-06-30T00:00:00Z", assigneeId: "u2", assigneeName: "Bob Martinez", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-05T00:00:00Z" },
  { _id: "4", title: "Write unit tests for user module", description: "Cover all user service functions", status: "done", priority: "medium", dueDate: "2026-06-25T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", creatorId: "u3", creatorName: "Carol Williams", createdAt: "2026-06-01T00:00:00Z", approvedBy: "u3", approvedAt: "2026-06-20T00:00:00Z" },
  { _id: "5", title: "Mobile responsive fixes", description: "Fix layout issues on mobile devices", status: "todo", priority: "medium", dueDate: "2026-07-05T00:00:00Z", assigneeId: "u4", assigneeName: "David Kim", creatorId: "u1", creatorName: "Alice Chen", createdAt: "2026-06-12T00:00:00Z" },
  { _id: "6", title: "Database optimization", description: "Add indexes and optimize slow queries", status: "in_progress", priority: "high", dueDate: "2026-07-02T00:00:00Z", assigneeId: "u3", assigneeName: "Carol Williams", creatorId: "u2", creatorName: "Bob Martinez", createdAt: "2026-06-09T00:00:00Z" },
  { _id: "7", title: "User onboarding flow", description: "Design and implement new user onboarding", status: "review", priority: "medium", dueDate: "2026-06-29T00:00:00Z", assigneeId: "u1", assigneeName: "Alice Chen", creatorId: "u3", creatorName: "Carol Williams", createdAt: "2026-06-07T00:00:00Z" },
  { _id: "8", title: "Security audit", description: "Review code for vulnerabilities", status: "cancelled", priority: "low", dueDate: "2026-06-20T00:00:00Z", assigneeId: "u2", assigneeName: "Bob Martinez", creatorId: "u4", creatorName: "David Kim", createdAt: "2026-06-03T00:00:00Z", rejectedBy: "u1", rejectedAt: "2026-06-18T00:00:00Z", rejectionReason: "Deferred to next sprint" },
];

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const [pending, setPending] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const [actionTask, setActionTask] = useState<ApprovalTask | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  const fetchPending = useCallback(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (orgId) {
          fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => setPending((res.data || res || []).filter((t: ApprovalTask) => t.status === "review")))
            .catch(() => setPending(FAKE_TASKS.filter((t) => t.status === "review")))
            .finally(() => setLoading(false));
        } else {
          setPending(FAKE_TASKS.filter((t) => t.status === "review"));
          setLoading(false);
        }
      })
      .catch(() => { setPending(FAKE_TASKS.filter((t) => t.status === "review")); setLoading(false); });
  }, [session]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

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

    const body = actionType === "approve"
      ? { status: "done", approvalNote: actionNote || null }
      : { status: "cancelled", rejectionReason: actionNote };

    try {
      const res = await fetch(`/api/tasks/${actionTask._id}`, {
        method: "PATCH",
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
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
              onClick={() => openAction(task, "approve")}
            >
              <CheckCircleIcon className="size-3 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => openAction(task, "reject")}
            >
              <XCircleIcon className="size-3 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="size-6" />
            <h1 className="text-2xl font-bold">Pending Approvals</h1>
            <Badge variant="secondary" className="ml-auto">{pending.length} pending</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle>Tasks awaiting review</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <DataTable
                  columns={actionColumns}
                  data={pending}
                  onRowClick={openView}
                  emptyMessage="No tasks pending approval."
                />
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      {/* View Task Detail Dialog */}
      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <>
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <ListTodoIcon className="size-5" />
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription>
                  Task details for approval review.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
                {selectedTask.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedTask.description}</p>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Priority</p>
                    <p className="font-medium capitalize mt-0.5">{selectedTask.priority}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <p className="font-medium capitalize mt-0.5">Review</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Assignee</p>
                    <p className="font-medium mt-0.5">{selectedTask.assigneeName || "—"}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Due Date</p>
                    <p className="font-medium mt-0.5">
                      {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Creator</p>
                    <p className="font-medium mt-0.5">{selectedTask.creatorName || "—"}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Created</p>
                    <p className="font-medium mt-0.5">
                      {selectedTask.createdAt ? new Date(selectedTask.createdAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
                <Button variant="outline" onClick={() => { setViewOpen(false); setSelectedTask(null); }}>
                  Close
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => { setViewOpen(false); openAction(selectedTask, "approve"); }}
                >
                  <CheckCircleIcon className="size-3.5 mr-1.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => { setViewOpen(false); openAction(selectedTask, "reject"); }}
                >
                  <XCircleIcon className="size-3.5 mr-1.5" />
                  Reject
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve / Reject Action Dialog */}
      <Dialog open={!!actionTask} onOpenChange={(o) => { if (!o) { setActionTask(null); setActionType(null); setActionNote(""); setActionError(""); } }}>
        <DialogContent className="p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {actionType === "approve" ? <CheckCircleIcon className="size-5 text-emerald-600" /> : <XCircleIcon className="size-5 text-red-600" />}
              {actionType === "approve" ? "Approve Task" : "Reject Task"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Confirm approval for "${actionTask?.title}"`
                : `Provide a reason for rejecting "${actionTask?.title}"`}
            </DialogDescription>
          </DialogHeader>

          {actionError && (
            <div className="mx-6 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="size-4 shrink-0" />
              {actionError}
            </div>
          )}

          <div className="px-6 py-3 space-y-3">
            {actionType === "reject" && (
              <div>
                <Label htmlFor="reason" className="text-sm">Rejection Reason *</Label>
                <Textarea
                  id="reason"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Explain why this task is being rejected..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            )}
            {actionType === "approve" && (
              <div>
                <Label htmlFor="note" className="text-sm">Approval Note (optional)</Label>
                <Textarea
                  id="note"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
            <Button variant="outline" onClick={() => { setActionTask(null); setActionType(null); setActionNote(""); setActionError(""); }} disabled={actionSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionSubmitting}
              className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
            >
              {actionSubmitting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : actionType === "approve" ? (
                <><CheckCircleIcon className="size-3.5 mr-1.5" /> Confirm Approve</>
              ) : (
                <><XCircleIcon className="size-3.5 mr-1.5" /> Confirm Reject</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
