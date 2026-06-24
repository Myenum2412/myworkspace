"use client";

import { useActionState, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Building2Icon, PencilIcon, Trash2Icon, AlertCircleIcon } from "lucide-react";
import { updateOrganization, deleteOrganization } from "@/actions/admin";

interface OrgRow {
  id: string;
  name: string;
  plan: string;
  domain: string;
  slug: string;
  createdAt: string;
}

function EditOrgDialog({ org }: { org: OrgRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      fd.set("id", org.id);
      const result = await updateOrganization(null, fd);
      if (result?.success) setOpen(false);
      return result;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <PencilIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name</Label>
            <Input id="edit-name" name="name" defaultValue={org.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-plan">Plan</Label>
            <Select name="plan" defaultValue={org.plan || "starter"}>
              <SelectTrigger id="edit-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-domain">Domain</Label>
            <Input id="edit-domain" name="domain" defaultValue={org.domain || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-slug">Slug</Label>
            <Input id="edit-slug" name="slug" defaultValue={org.slug || ""} />
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

function DeleteOrgButton({ org }: { org: OrgRow }) {
  return (
    <form action={deleteOrganization}>
      <input type="hidden" name="id" value={org.id} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="size-8 text-red-500 hover:text-red-700 hover:bg-red-50"
        onClick={(e) => {
          if (!confirm(`Delete organization "${org.name}"? This will also remove all its members.`)) {
            e.preventDefault();
          }
        }}
      >
        <Trash2Icon className="size-4" />
      </Button>
    </form>
  );
}

interface OrgsTableProps {
  orgs: OrgRow[];
}

export function OrgsTable({ orgs }: OrgsTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === orgs.length) return new Set();
      return new Set(orgs.map((o) => o.id));
    });
  };

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        {selected.size > 0 && (
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={selected.size === orgs.length && orgs.length > 0}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Domain</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orgs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                No organizations found.
              </TableCell>
            </TableRow>
          ) : (
            orgs.map((o) => (
              <TableRow key={o.id} className={selected.has(o.id) ? "bg-muted/30" : ""}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(o.id)}
                    onCheckedChange={() => toggle(o.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{o.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
                    {o.plan || "starter"}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.domain || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.slug || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.createdAt}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditOrgDialog org={o} />
                    <DeleteOrgButton org={o} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
