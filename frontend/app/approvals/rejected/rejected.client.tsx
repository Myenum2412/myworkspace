"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { XCircleIcon, Loader2Icon, ListTodoIcon, FileIcon } from "lucide-react";
import { DataTable } from "../data-table";
import { rejectedColumns, type ApprovalItem } from "../columns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface RejectedProps {
  initialItems: ApprovalItem[];
}

export default function Rejected({ initialItems }: RejectedProps) {
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
          <XCircleIcon className="size-5 sm:size-6 text-destructive shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Rejected</h1>
          <Badge variant="secondary" className="ml-auto shrink-0">{items.length} rejected</Badge>
        </div>

        <DataTable columns={rejectedColumns} data={items} onRowClick={openView} emptyMessage="No rejected items." />
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
                <DialogDescription>Rejected {isFile ? "file upload" : "task"} details.</DialogDescription>
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
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Type</p><p className="font-medium capitalize mt-0.5">{selectedItem.itemType}</p></div>
                  {!isFile && (
                    <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Priority</p><p className="font-medium capitalize mt-0.5">{selectedItem.priority}</p></div>
                  )}
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Status</p><p className="font-medium text-red-600 mt-0.5">Rejected</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">{isFile ? "Uploaded By" : "Assignee"}</p><p className="font-medium mt-0.5">{(isFile ? selectedItem.uploaderName : selectedItem.assigneeName) || "—"}</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Rejected By</p><p className="font-medium mt-0.5">{selectedItem.rejectedBy || "—"}</p></div>
                  <div className="rounded-lg border bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">Rejected At</p><p className="font-medium mt-0.5">{selectedItem.rejectedAt ? new Date(selectedItem.rejectedAt).toLocaleDateString() : "—"}</p></div>
                </div>
                {selectedItem.rejectionReason && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Rejection Reason</p>
                      <div className="rounded-lg border bg-red-50 px-3 py-2 text-sm text-red-700">{selectedItem.rejectionReason}</div>
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
