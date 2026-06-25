"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircleIcon, Loader2Icon, ListTodoIcon } from "lucide-react";
import { DataTable } from "../data-table";
import { approvedColumns, type ApprovalTask } from "../columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ApprovedPage() {
  const { data: session } = useSession();
    const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<ApprovalTask | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  
  const fetchApproved = useCallback(() => {
    if (!session?.user) return;
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const profile = d.data || d;
        const orgId = profile?.org?.id || profile?.org?._id?.toString() || "";
        if (orgId) {
          fetch(`/api/tasks?orgId=${orgId}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => setTasks((res.data || res || []).filter((t: ApprovalTask) => t.status === "done")))
            .catch(() => {})
            .finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [session]);

  useEffect(() => { fetchApproved(); }, [fetchApproved]);

  function openView(task: ApprovalTask) {
    setSelectedTask(task);
    setViewOpen(true);
  }

  return (
                                <>
                                <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="size-6 text-red-400" />
            <h1 className="text-2xl font-bold">Approved</h1>
            <Badge variant="secondary" className="ml-auto">{tasks.length} approved</Badge>
          </div>

          <Card>
            <CardHeader><CardTitle>Approved Tasks</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>
              ) : (
                <DataTable
                  columns={approvedColumns}
                  data={tasks}
                  onRowClick={openView}
                  emptyMessage="No approved tasks."
                />
              )}
            </CardContent>
          </Card>
        </main>
      
      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col">
          {selectedTask && (
            <>
              <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <ListTodoIcon className="size-5" />
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription>Approved task details.</DialogDescription>
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
                    <p className="font-medium text-red-400 mt-0.5">Approved</p>
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
                    <p className="text-[11px] text-muted-foreground">Approved By</p>
                    <p className="font-medium mt-0.5">{selectedTask.approvedBy || "—"}</p>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Approved At</p>
                    <p className="font-medium mt-0.5">
                      {selectedTask.approvedAt ? new Date(selectedTask.approvedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>

                {selectedTask.approvalNote && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Approval Note</p>
                      <p className="text-sm">{selectedTask.approvalNote}</p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="shrink-0 border-t px-6 py-4">
                <Button variant="outline" onClick={() => { setViewOpen(false); setSelectedTask(null); }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
        </>
      );
}
