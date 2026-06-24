"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlusIcon className="size-5" />
          Recent Signups
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
            placeholder="Search signups..."
            className="pl-9 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Login</TableHead>
                {isSuperAdmin && <TableHead>Organization</TableHead>}
                {isSuperAdmin && <TableHead>Org ID</TableHead>}
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-32 text-center text-muted-foreground">
                    {search ? "No signups match your search" : "No recent signups"}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow
                    key={u.userId}
                    className={selected.has(u.userId) ? "bg-muted/30" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(u.userId)}
                        onCheckedChange={() => toggle(u.userId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={u.avatar} alt={u.name} />
                          <AvatarFallback className="text-[10px]">{u.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : u.role === "manager" ? "secondary" : "outline"} className="text-xs">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[u.status] || "outline"} className="text-xs capitalize">
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium capitalize ${providerColors[u.provider] || "text-muted-foreground"}`}>
                        {u.provider}
                      </span>
                    </TableCell>
                    <TableCell>
                      {u.emailVerified ? (
                        <CheckCircle2Icon className="size-4 text-green-500" />
                      ) : (
                        <XCircleIcon className="size-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(u.createdAt || u.joinedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(u.lastLogin)}</TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{u.orgName || "—"}</Badge>
                      </TableCell>
                    )}
                    {isSuperAdmin && (
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">{u.orgId || "—"}</span>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <EditSignupDialog user={{ ...u, createdAt: u.createdAt || u.joinedAt || new Date().toISOString() }}>
                          <Button variant="ghost" size="icon" className="size-8">
                            <PencilIcon className="size-4" />
                          </Button>
                        </EditSignupDialog>
                        <DeleteSignupForm user={{ ...u, createdAt: u.createdAt || u.joinedAt || new Date().toISOString() }} />
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
