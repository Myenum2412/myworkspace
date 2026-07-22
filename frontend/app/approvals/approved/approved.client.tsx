"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircleIcon, Loader2Icon, ListTodoIcon, FileIcon } from "lucide-react";
import { DataTable } from "../data-table";
import { approvedColumns, type ApprovalItem } from "../columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApprovedProps {
  initialItems: ApprovalItem[];
}

export default function Approved({ initialItems }: ApprovedProps) {
  const [items, setItems] = useState<ApprovalItem[]>(initialItems);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  function openView(item: ApprovalItem) {
    setSelectedItem(item);
    setViewOpen(true);
  }

  const isFile = selectedItem?.itemType === "file";

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="size-5 sm:size-6 text-success shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Approved</h1>
          <Badge variant="secondary" className="ml-auto shrink-0">{items.length} approved</Badge>
        </div>

        <DataTable columns={approvedColumns} data={items} onRowClick={openView} emptyMessage="No approved items." />
      </main>

      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setSelectedItem(null); } }}>
        <DialogContent className="p-0 flex flex-col" showCloseButton={false}>
          {selectedItem && (
            <>
              <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {isFile ? <FileIcon className="size-4 sm:size-5" /> : <ListTodoIcon className="size-4 sm:size-5" />}
                  {selectedItem.title}
                </DialogTitle>
                <DialogDescription>Approved {isFile ? "file upload" : "task"} details.</DialogDescription>
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
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Status</p><p className="font-medium text-green-400 mt-0.5">Approved</p></div>
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">{isFile ? "Uploaded By" : "Assignee"}</p><p className="font-medium mt-0.5">{(isFile ? selectedItem.uploaderName : selectedItem.assigneeName) || "—"}</p></div>
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Approved By</p><p className="font-medium mt-0.5">{selectedItem.approvedBy || "—"}</p></div>
                  <div className="rounded-sm border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Approved At</p><p className="font-medium mt-0.5">{selectedItem.approvedAt ? new Date(selectedItem.approvedAt).toLocaleDateString() : "—"}</p></div>
                </div>
                {selectedItem.approvalNote && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Approval Note</p>
                      <p className="text-sm">{selectedItem.approvalNote}</p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter className="shrink-0 border-t px-4 sm:px-6 py-4">
                <Button variant="outline" onClick={() => { setViewOpen(false); setSelectedItem(null); }} className="w-full sm:w-auto touch-target">Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
