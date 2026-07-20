"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ROLES } from "@/lib/rbac";
import { UserPlusIcon, PencilIcon, Trash2Icon, SearchIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { EditSignupDialog, DeleteSignupForm } from "@/components/dashboard-actions";

interface SignupRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  provider: string;
  emailVerified: boolean;
  avatar?: string;
  createdAt: string;
  joinedAt?: string;
  lastLogin?: string;
  orgName?: string;
  orgId?: string;
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

function fmt(d?: string): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

export function DashboardSignupsTable({
  users,
  isSuperAdmin,
}: {
  users: SignupRow[];
  isSuperAdmin: boolean;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.provider.toLowerCase().includes(q) ||
        u.orgName?.toLowerCase().includes(q),
    );
  }, [search, users]);

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
      return new Set(filtered.map((u) => u.userId));
    });
  };

  const colSpan = isSuperAdmin ? 12 : 10;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <CardTitle className="flex items-center gap-2 shrink-0">
          <UserPlusIcon className="size-5" />
          Recent Signups
        </CardTitle>
        {selected.size > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            {selected.size} selected
          </span>
        )}
        <div className="relative w-full max-w-sm mx-auto">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder=""
            className="pl-9 h-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
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
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Email</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Role</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Provider</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Verified</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Joined</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Last Login</th>
                {isSuperAdmin && <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Organization</th>}
                {isSuperAdmin && <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Org ID</th>}
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-3 h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 py-8">
                      <UserPlusIcon className="size-8 text-muted-foreground/40" />
                      <span>{search ? "No signups match your search" : "No recent signups"}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr
                    key={u.userId}
                    className={`bg-white group hover:bg-slate-50 transition-colors ${selected.has(u.userId) ? "bg-muted/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(u.userId)}
                        onCheckedChange={() => toggle(u.userId)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={u.avatar} alt={u.name} />
                          <AvatarFallback className="text-[10px]">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === ROLES.MEMBERS ? "default" : "outline"} className="text-xs">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[u.status] || "outline"} className="text-xs capitalize">
                        {u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium capitalize ${providerColors[u.provider] || "text-muted-foreground"}`}>
                        {u.provider}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.emailVerified ? (
                        <CheckCircle2Icon className="size-4 text-success" />
                      ) : (
                        <XCircleIcon className="size-4 text-muted-foreground" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmt(u.createdAt || u.joinedAt)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{fmt(u.lastLogin)}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{u.orgName || "—"}</Badge>
                      </td>
                    )}
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground font-mono">{u.orgId || "—"}</span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <EditSignupDialog user={{ ...u, createdAt: u.createdAt || u.joinedAt || new Date().toISOString() }}>
                          <Button variant="ghost" size="icon" className="size-8">
                            <PencilIcon className="size-4" />
                          </Button>
                        </EditSignupDialog>
                        <DeleteSignupForm user={{ ...u, createdAt: u.createdAt || u.joinedAt || new Date().toISOString() }} />
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
  );
}
