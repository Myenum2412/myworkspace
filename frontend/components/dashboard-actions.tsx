"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PencilIcon, Trash2Icon, AlertCircleIcon } from "lucide-react";
import { updateRecentUser, deleteRecentUser, deleteOrganization } from "@/actions/admin";

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
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      fd.set("userId", user.userId);
      const result = await updateRecentUser(null, fd);
      if (result?.success) setOpen(false);
      return result;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="ds-name">Name</Label>
            <Input id="ds-name" name="name" defaultValue={user.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-email">Email</Label>
            <Input id="ds-email" name="email" defaultValue={user.email} type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-role">Role</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger id="ds-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ds-status">Status</Label>
            <Select name="status" defaultValue={user.status}>
              <SelectTrigger id="ds-status">
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSignupForm({ user }: { user: SignupRow }) {
  return (
    <form action={deleteRecentUser}>
      <input type="hidden" name="userId" value={user.userId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-7 text-black hover:text-gray-600 hover:bg-blue-50"
        onClick={(e) => {
          if (!confirm(`Delete user "${user.name}"?`)) e.preventDefault();
        }}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </form>
  );
}

export function DeleteOrgDashboardButton({ orgId, orgName }: { orgId: string; orgName: string }) {
  return (
    <form action={deleteOrganization}>
      <input type="hidden" name="id" value={orgId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-7 text-black hover:text-gray-600 hover:bg-blue-50"
        onClick={(e) => {
          if (!confirm(`Delete organization "${orgName}"?`)) e.preventDefault();
        }}
      >
        <Trash2Icon className="size-3.5" />
      </Button>
    </form>
  );
}
