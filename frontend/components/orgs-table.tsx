"use client";

import { useActionState, useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
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
  EyeIcon,
  CalendarDays,
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

function ViewOrgDialog({ org, open, onOpenChange }: { org: OrgRow | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!org) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <Building2Icon className="size-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">{org.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{org.domain || org.slug}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
              <TagIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Plan</p>
                <p className="text-sm font-medium mt-0.5 capitalize">{org.plan || "free"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
              <GlobeIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Domain</p>
                <p className="text-sm font-medium mt-0.5">{org.domain || "\u2014"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
              <HashIcon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Slug</p>
                <p className="text-sm font-medium mt-0.5">{org.slug || "\u2014"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
              <CalendarDays className="size-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Created</p>
                <p className="text-sm font-medium mt-0.5">{org.createdAt}</p>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
            <div className="mx-6 mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">
              <AlertCircleIcon className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

          <div className="px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                <Building2Icon className="size-3.5 text-muted-foreground" />
                Organization Name
              </Label>
              <Input
                name="name"
                defaultValue={org.name}
                required
                placeholder=""
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  <TagIcon className="size-3.5 text-muted-foreground" />
                  Plan
                </Label>
                <Select name="plan" defaultValue={org.plan === "starter" ? "free" : org.plan === "pro" ? "growth" : org.plan || "free"}>
                  <SelectTrigger>
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
                <Label className="text-xs text-muted-foreground">
                  <GlobeIcon className="size-3.5 text-muted-foreground" />
                  Domain
                </Label>
                <Input
                  name="domain"
                  defaultValue={org.domain || ""}
                  placeholder=""
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                <HashIcon className="size-3.5 text-muted-foreground" />
                Slug
              </Label>
              <Input
                name="slug"
                defaultValue={org.slug || ""}
                placeholder=""
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
  const [viewOrg, setViewOrg] = useState<OrgRow | null>(null);

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
    <>
      <ViewOrgDialog
        org={viewOrg}
        open={!!viewOrg}
        onOpenChange={(open) => { if (!open) setViewOrg(null); }}
      />
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
        <div className="flex">
          <div className="flex-1" />
          <div className="relative w-full max-w-sm">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder=""
              className="pl-9 h-9 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex-1" />
        </div>
        <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="table-premium w-full text-sm text-left">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-10">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Name</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Plan</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Domain</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Slug</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Created</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-32 text-center text-muted-foreground px-4 py-3">
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <Building2Icon className="size-8 text-muted-foreground/40" />
                      <span>{search ? "No organizations match your search" : "No organizations found"}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className={`bg-white group hover:bg-slate-50 transition-colors cursor-pointer ${selected.has(o.id) ? "bg-muted/30" : ""}`} onClick={() => setViewOrg(o)}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(o.id)}
                        onCheckedChange={() => toggle(o.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2Icon className="size-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{o.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
                        {o.plan || "free"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.domain || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.slug || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{o.createdAt}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <EditOrgDialog org={o} />
                        <DeleteOrgButton org={o} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
