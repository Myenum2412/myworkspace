"use client";

import { useState, useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { Building2Icon, FolderIcon, FileIcon, ChevronRightIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

export function ClientFilesView() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { orgId } = useFileSystemStore();

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetch(`/api/clients?orgId=${encodeURIComponent(orgId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const arr: Record<string, unknown>[] = d.data || d || [];
        setClients(arr.map((c: any) => ({ id: c.id, name: c.name, company: c.company || "", email: c.email || "", status: c.status || "Active" })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId]);

  const filtered = clients.filter((c) =>
    !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2Icon className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Building2Icon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No clients yet</p>
        <p className="text-xs">Create a client to manage their files here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Building2Icon className="size-4" /> Client Files</h2>
          <p className="text-sm text-muted-foreground">{clients.length} client{clients.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="relative w-64">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input placeholder="Search clients..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((c) => (
          <a
            key={c.id}
            href={`/clients/${c.id}`}
            className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2Icon className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground truncate">{c.company || c.email}</p>
            </div>
            <Badge variant={c.status === "Active Client" ? "default" : "secondary"} className="text-[10px] shrink-0">
              {c.status || "Active"}
            </Badge>
          </a>
        ))}
      </div>
    </div>
  );
}
