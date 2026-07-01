"use client";

import { useActionState, useMemo, useState } from "react";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2Icon,
  PencilIcon,
  Trash2Icon,
  AlertCircleIcon,
  SearchIcon,
  GlobeIcon,
  TagIcon,
  HashIcon,
  CheckCircle2Icon,
} from "lucide-react";
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
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
          <DialogHeader className="text-white">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2Icon className="size-5" />
              Edit Organization
            </DialogTitle>
          </DialogHeader>
        </div>

        <form action={formAction} className="flex flex-col">
          {state?.error && (
            <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              <AlertCircleIcon className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

          <div className="px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Building2Icon className="size-3.5 text-muted-foreground" />
                Organization Name
              </Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={org.name}
                required
                placeholder="Enter organization name"
                className="h-10"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-plan" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <TagIcon className="size-3.5 text-muted-foreground" />
                  Plan
                </Label>
                <Select name="plan" defaultValue={org.plan === "starter" ? "free" : org.plan === "pro" ? "growth" : org.plan || "free"}>
                  <SelectTrigger id="edit-plan" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-domain" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <GlobeIcon className="size-3.5 text-muted-foreground" />
                  Domain
                </Label>
                <Input
                  id="edit-domain"
                  name="domain"
                  defaultValue={org.domain || ""}
                  placeholder="e.g. example.com"
                  className="h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-slug" className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <HashIcon className="size-3.5 text-muted-foreground" />
                Slug
              </Label>
              <Input
                id="edit-slug"
                name="slug"
                defaultValue={org.slug || ""}
                placeholder="url-friendly-slug"
                className="h-10"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-muted/30 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="px-5">
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              {pending ? (
                <>
                  <span className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="size-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
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
        className="size-8 text-black hover:text-gray-600 hover:bg-blue-50"
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
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.plan.toLowerCase().includes(q) ||
        o.domain.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q),
    );
  }, [search, orgs]);

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
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((o) => o.id));
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2Icon className="size-5" />
          Organizations
          {selected.size > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-auto">
              {selected.size} selected
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader className="bg-blue-50">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="bg-blue-50">Name</TableHead>
                <TableHead className="bg-blue-50">Plan</TableHead>
                <TableHead className="bg-blue-50">Domain</TableHead>
                <TableHead className="bg-blue-50">Slug</TableHead>
                <TableHead className="bg-blue-50">Created</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    {search ? "No organizations match your search" : "No organizations found"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
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
                        {o.plan || "free"}
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
      </CardContent>
    </Card>
  );
}
