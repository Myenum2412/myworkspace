"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2Icon, Loader2Icon } from "lucide-react";
import type { ProjectDeleteDialogProps } from "./project-types";

export default function ProjectDeleteDialog({
  deleteConfirm,
  setDeleteConfirm,
  deleting,
  onDelete,
}: ProjectDeleteDialogProps) {
  return (
    <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2Icon className="size-5" />
            Delete Project
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:flex-1 touch-target" onClick={() => setDeleteConfirm(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="w-full sm:flex-1 touch-target"
            onClick={() => deleteConfirm && onDelete(deleteConfirm)}
            disabled={deleting}
          >
            {deleting ? <Loader2Icon className="size-4 animate-spin" /> : <><Trash2Icon className="size-4 mr-1.5" /> Delete</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
