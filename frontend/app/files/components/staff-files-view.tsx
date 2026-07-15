"use client";

import { useState, useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { UserIcon, FileIcon, Loader2Icon, SearchIcon, BriefcaseIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type StaffRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
};

export function StaffFilesView() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { orgId } = useFileSystemStore();

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/employees?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr: Record<string, unknown>[] = d.data || d || [];
        setStaff(arr.map((s: any) => ({
          id: s.id || s._id,
          name: s.name || s.fullName || `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email,
          email: s.email || "",
          role: s.role || s.jobTitle || "Employee",
          department: s.department || s.departmentName || "",
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = staff.filter((s) =>
    !search.trim() || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <UserIcon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No staff members yet</p>
        <p className="text-xs">Add employees to manage their files here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><UserIcon className="size-4" /> Staff Files</h2>
          <p className="text-sm text-muted-foreground">{staff.length} staff member{staff.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-64">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Search staff..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((s) => (
          <a
            key={s.id}
            href={`/employees/${s.id}`}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="size-10 rounded-full bg-accent flex items-center justify-center shrink-0">
              <UserIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground truncate">{s.department || s.role || s.email}</p>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{s.role}</Badge>
          </a>
        ))}
      </div>
    </div>
  );
}
