"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardListIcon,
  SearchIcon,
  XIcon,
  ChevronLeft,
  ChevronRight,
  Trash2Icon,
  Loader2Icon,
  MoreHorizontalIcon,
} from "@/lib/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/page-header";

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  user: string;
  details: string;
  createdAt: string;
}

export default function AuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); }
  }, [status, router]);

  const fetchLogs = () => {
    setLoading(true);
    fetch("/api/orgmenu/audit")
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, []);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(
      l =>
        l.user.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q))
    );
  }, [logs, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const paginatedLogs = filteredLogs.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedLogs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedLogs.map(l => l.id)));
    }
  };

  const allSelected = paginatedLogs.length > 0 && selectedIds.size === paginatedLogs.length;
  const hasActiveFilters = searchQuery.length > 0;

  const handleDelete = async (ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    if (targetIds.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/orgmenu/audit", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targetIds }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchLogs();
      }
    } catch {}
    setDeleting(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }
  if (!session?.user) return null;

  return (
    <main className="flex flex-1 flex-col gap-0 p-4 sm:p-6">
      {/* Header */}
      <PageHeader
        className="mb-4 sm:mb-6"
        icon={<ClipboardListIcon className="size-6" />}
        title={<h1>Audit Logs</h1>}
        subtitle={<p>
          {filteredLogs.length} {filteredLogs.length === 1 ? "log" : "logs"}
          {hasActiveFilters ? " found" : " total"}
        </p>}
        search={
          <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by user, action..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setPage(0); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        }
        actions={
          selectedIds.size > 0 ? (
            <Button variant="destructive" size="sm" onClick={() => handleDelete()} disabled={deleting}>
              {deleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
              <span className="ml-1.5">Delete ({selectedIds.size})</span>
            </Button>
          ) : null
        }
      />

      {/* Search (mobile) */}
      <div className="relative w-full mb-4 sm:hidden">
        <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by user, action..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            className="pl-9 h-10 border-0 shadow-none focus-visible:ring-0 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setPage(0); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)]">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 700 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" className="border-white" />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">User</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Activity</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Date : Time</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
                        <ClipboardListIcon className="size-6 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {hasActiveFilters ? "No logs match your search" : "No audit logs yet"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {hasActiveFilters ? "Try adjusting your search" : "Activity will appear here as users perform actions"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const selected = selectedIds.has(log.id);
                  return (
                    <tr
                      key={log.id}
                      className={`group border-b bg-white hover:bg-slate-50 transition-colors${selected ? " selected" : ""}`}
                    >
                      <td className="px-4 py-3 w-10">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleSelect(log.id)}
                          aria-label={`Select log ${log.id}`}
                          className="border-black"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900 whitespace-nowrap">{log.user}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800">{log.action.split(".").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</span>
                        {log.details && <p className="text-xs text-gray-500 mt-0.5">{log.details}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="">
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={() => handleDelete([log.id])}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2Icon className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {filteredLogs.length === 0
              ? "0 items"
              : `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredLogs.length)} of ${filteredLogs.length}`}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => { setRowsPerPage(Number(value)); setPage(0); }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="90">90</SelectItem>
                  <SelectItem value="120">120</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={(page + 1) * rowsPerPage >= filteredLogs.length}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
