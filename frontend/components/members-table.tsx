"use client";

import { useActionState, useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { SearchIcon, CheckCircle2Icon, XCircleIcon, PencilIcon, Trash2Icon, AlertCircleIcon, EyeIcon, Building2, Briefcase, Phone, MapPin, CalendarDays, ShieldCheck, LogIn, Globe, BadgeCheck } from "lucide-react";
import { updateMember, deleteMember } from "@/actions/admin";

interface MemberData {
  id: string;
  userId: string;
  orgId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  status: string;
  provider: string;
  emailVerified: boolean;
  createdAt?: Date;
  joinedAt?: Date;
  lastLogin?: Date;
  orgName?: string;
  phone?: string;
  location?: string;
  department?: string;
  designation?: string;
}

const providerColors: Record<string, string> = {
  google: "text-[#4285F4]",
  github: "text-[#333] dark:text-[#f0f0f0]",
  linkedin: "text-[#0A66C2]",
  credentials: "text-muted-foreground",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  online: "default",
  offline: "outline",
  break: "secondary",
};

function fmt(d?: Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

interface EditMemberDialogProps {
  member: MemberData;
  onClose: () => void;
}

function fmtDate(d?: Date): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function EditMemberDialog({ member, onClose }: EditMemberDialogProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: unknown, fd: FormData) => {
      fd.set("userId", member.userId);
      const result = await updateMember(null, fd);
      if (result?.success) onClose();
      return result;
    },
    null,
  );

  const initials = member.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
        </DialogHeader>

        {/* Profile summary strip */}
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 px-4 py-3">
          <Avatar className="size-14">
            <AvatarImage src={member.avatar} alt={member.name} />
            <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{member.name}</div>
            <div className="text-sm text-muted-foreground truncate">{member.email}</div>
          </div>
          <Badge variant={member.role === "admin" ? "default" : member.role === "manager" ? "secondary" : "outline"} className="capitalize">
            {member.role}
          </Badge>
        </div>

        <form action={formAction} className="space-y-5">
          {state?.error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950 rounded-md px-3 py-2">
              <AlertCircleIcon className="size-4 shrink-0" />
              {state.error}
            </div>
          )}

          {/* Personal info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input id="edit-name" name="name" defaultValue={member.name} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" name="email" defaultValue={member.email} type="email" required />
              </div>
            </div>
          </div>

          {/* Work info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-role">Role</Label>
                <Select name="role" defaultValue={member.role}>
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="member">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={member.status}>
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-department">Department</Label>
                <Input id="edit-department" name="department" defaultValue={member.department || ""} placeholder="e.g. Engineering" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input id="edit-designation" name="designation" defaultValue={member.designation || ""} placeholder="e.g. Senior Engineer" />
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" name="phone" defaultValue={member.phone || ""} placeholder="+1 555 0100" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-location">Location</Label>
                <Input id="edit-location" name="location" defaultValue={member.location || ""} placeholder="e.g. Berlin" />
              </div>
            </div>
          </div>

          {/* Meta info (read-only) */}
          <div className="rounded-lg border bg-muted/20 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground text-xs">Joined</div>
              <div className="font-medium">{fmtDate(member.joinedAt || member.createdAt)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Last Login</div>
              <div className="font-medium">{fmtDate(member.lastLogin)}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Provider</div>
              <div className="font-medium capitalize">{member.provider}</div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs">Verified</div>
              <div className="font-medium">
                {member.emailVerified ? (
                  <span className="inline-flex items-center gap-1 text-green-600">
                    <CheckCircle2Icon className="size-3.5" /> Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <XCircleIcon className="size-3.5" /> No
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface MembersTableProps {
  members: MemberData[];
  isSuperAdmin: boolean;
}

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | number | null | boolean }) {
  const display = typeof value === "boolean"
    ? value ? "Yes" : "No"
    : (value ?? "\u2014");
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5">{display}</p>
      </div>
    </div>
  );
}

function MemberViewDialog({ member, open, onOpenChange }: { member: MemberData | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  if (!member) return null;
  const initials = member.name.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <Avatar className="size-12 ring-2 ring-border">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-lg">{member.name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{member.email}</p>
            </div>
          </div>
        </DialogHeader>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={Building2} label="Department" value={member.department} />
            <Field icon={Briefcase} label="Designation" value={member.designation} />
            <Field icon={ShieldCheck} label="Role" value={member.role} />
            <Field icon={BadgeCheck} label="Status" value={member.status} />
            <Field icon={Globe} label="Provider" value={member.provider} />
            <Field icon={CheckCircle2Icon} label="Email Verified" value={member.emailVerified} />
            <Field icon={CalendarDays} label="Joined" value={fmt(member.createdAt || member.joinedAt)} />
            <Field icon={LogIn} label="Last Login" value={fmt(member.lastLogin)} />
            <Field icon={Phone} label="Phone" value={member.phone} />
            <Field icon={MapPin} label="Location" value={member.location} />
          </div>
        </div>
        <DialogFooter className="border-t px-6 py-4 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MembersTable({ members, isSuperAdmin }: MembersTableProps) {
  const [search, setSearch] = useState("");
  const [editingMember, setEditingMember] = useState<MemberData | null>(null);
  const [viewMember, setViewMember] = useState<MemberData | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.orgName?.toLowerCase().includes(q),
    );
  }, [search, members]);

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
      return new Set(filtered.map((m) => m.id));
    });
  };

  const colSpan = 11;

  return (
    <>
      <MemberViewDialog
        member={viewMember}
        open={!!viewMember}
        onOpenChange={(open) => { if (!open) setViewMember(null); }}
      />
      {editingMember && (
        <EditMemberDialog member={editingMember} onClose={() => setEditingMember(null)} />
      )}

      <div className="flex mb-4">
        <div className="flex-1" />
        <div className="relative w-full max-w-sm">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-9 h-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1" />
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-[#f3f4f6]">
          {selected.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selected.size} selected
            </span>
          )}
        </div>
        <table className="w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f3f4f6] text-gray-900 border-b">
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-10">
                <Checkbox
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleAll}
                />
              </th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Name</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Email</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Role</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Status</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Provider</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Verified</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Joined</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Last Login</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Organization</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-3 h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <span className="text-muted-foreground/40 text-lg font-semibold">👤</span>
                    <span>{search ? "No members match your search" : "No members found"}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr key={member.id} className={`bg-white group hover:bg-slate-50 transition-colors cursor-pointer ${selected.has(member.id) ? "bg-muted/30" : ""}`} onClick={() => setViewMember(member)}>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(member.id)}
                      onCheckedChange={() => toggle(member.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-[10px]">{member.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{member.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={member.role === "admin" ? "default" : member.role === "manager" ? "secondary" : "outline"} className="text-xs">
                      {member.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[member.status] || "outline"} className="text-xs capitalize">
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${providerColors[member.provider] || "text-muted-foreground"}`}>
                      {member.provider}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {member.emailVerified ? (
                      <CheckCircle2Icon className="size-4 text-success" />
                    ) : (
                      <XCircleIcon className="size-4 text-muted-foreground" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{fmt(member.createdAt || member.joinedAt)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{fmt(member.lastLogin)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{member.orgName}</Badge>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setEditingMember(member)}>
                        <PencilIcon className="size-4" />
                      </Button>
                      <form action={deleteMember}>
                        <input type="hidden" name="userId" value={member.userId} />
                        <input type="hidden" name="orgId" value={member.orgId} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-black hover:text-gray-600 hover:bg-blue-50"
                          onClick={(e) => {
                            if (!confirm(`Delete member "${member.name}"?`)) e.preventDefault();
                          }}
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
