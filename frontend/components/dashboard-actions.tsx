"use client";

import { useActionState, useState } from "react";
import { deleteOrganization, deleteRecentUser, updateRecentUser } from "@/actions/admin";
import { DeleteConfirmDialog } from "@/components/dialog-03";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { AlertCircleIcon, PencilIcon, Trash2Icon } from "@/lib/icons";
import { ROLES } from "@/lib/rbac";

interface SignupRow {
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  userId: string;
}

export function EditSignupDialog({
  user,
  children,
}: {
  user: SignupRow;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(async (_prev: unknown, fd: FormData) => {
    fd.set("userId", user.userId);
    const result = await updateRecentUser(null, fd);
    if (result?.success) setOpen(false);
    return result;
  }, null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-sm px-3 py-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {state.error}
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Name</Label>
            <Input name="name" defaultValue={user.name} required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input name="email" defaultValue={user.email} type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROLES.MEMBERS}>Members</SelectItem>
                <SelectItem value={ROLES.STAFFS}>Staffs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select name="status" defaultValue={user.status}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
                <SelectItem value="break">Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-32 h-10"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="w-32 h-10">
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSignupForm({ user }: { user: SignupRow }) {
  return (
    <DeleteConfirmDialog
      title="Delete user"
      description={`Are you sure you want to delete user "${user.name}"? This action cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={async () => {
        const fd = new FormData();
        fd.set("userId", user.userId);
        await deleteRecentUser(fd);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </DeleteConfirmDialog>
  );
}

export function DeleteOrgDashboardButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  return (
    <DeleteConfirmDialog
      title="Delete organization"
      description={`Are you sure you want to delete organization "${orgName}"? This action cannot be undone.`}
      confirmLabel="Delete"
      onConfirm={async () => {
        const fd = new FormData();
        fd.set("id", orgId);
        await deleteOrganization(fd);
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </DeleteConfirmDialog>
  );
}
