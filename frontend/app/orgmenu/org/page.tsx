"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
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
  Building2Icon,
  SearchIcon,
  XIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Member {
  userId: string;
  role: string;
  name: string;
  email: string;
  avatar: string;
  status: string;
  companyName: string;
  phone: string;
  department: string;
  designation: string;
  registeredAt: string;
}

export default function OrgPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/orgmenu/org")
      .then(r => r.json())
      .then(d => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      m => (m.name || "").toLowerCase().includes(q) ||
           (m.email || "").toLowerCase().includes(q) ||
           (m.role || "").toLowerCase().includes(q) ||
           (m.companyName || "").toLowerCase().includes(q) ||
           (m.department || "").toLowerCase().includes(q) ||
           (m.designation || "").toLowerCase().includes(q) ||
           (m.phone || "").toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / rowsPerPage));
  const paginatedMembers = filteredMembers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const hasActiveFilters = searchQuery.length > 0;

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "U";
  };

  const displayStatus = (s: string) => {
    if (!s) return "Offline";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div className="flex items-center justify-center size-10 rounded-sm bg-primary/10 shrink-0">
            <Building2Icon className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Organization</h1>
            <p className="text-sm text-muted-foreground">
              {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
              {hasActiveFilters ? " found" : " total"}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-md mx-auto px-4 hidden sm:block">
          <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
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
        </div>
      </div>

      <div className="relative w-full mb-4 sm:hidden">
        <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
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

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)] rounded-lg">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 1200 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Name</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Company Name</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Email ID</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Phone</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Department</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Designation</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Role</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Status</span></th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Registered</span></th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap"><span className="text-white">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
                        <Building2Icon className="size-6 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {hasActiveFilters ? "No members match your search" : "No members yet"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => (
                  <tr key={m.userId} className="group border-b bg-white hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} className="size-8 rounded-sm object-cover ring-2 ring-background" />
                        ) : (
                          <div className="size-8 rounded-sm flex items-center justify-center text-xs font-semibold bg-primary/10 text-primary">
                            {getInitials(m.name)}
                          </div>
                        )}
                        <span className="font-medium text-gray-900 whitespace-nowrap">{m.name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="text-gray-700">{m.companyName || "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-gray-700">{m.email || "—"}</span></td>
                    <td className="px-4 py-3"><span className="text-gray-700">{m.phone || "—"}</span></td>
                    <td className="px-4 py-3">
                      {m.department ? (
                        <span className="inline-flex items-center rounded-sm bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">{m.department}</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3"><span className="text-gray-800">{m.designation || <span className="text-gray-300">—</span>}</span></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-sm border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-medium capitalize">{m.role || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium ${
                        m.status === "online" ? "bg-green-50 text-green-700" :
                        m.status === "away" ? "bg-yellow-50 text-yellow-700" :
                        "bg-gray-50 text-gray-500"
                      }`}>
                        <span className={`size-1.5 rounded-sm ${
                          m.status === "online" ? "bg-green-500" :
                          m.status === "away" ? "bg-yellow-500" :
                          "bg-gray-400"
                        }`} />
                        {displayStatus(m.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3"><span className="text-gray-500 text-xs">{formatDate(m.registeredAt)}</span></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="text-gray-300">—</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {filteredMembers.length === 0
              ? "0 items"
              : `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filteredMembers.length)} of ${filteredMembers.length}`}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setPage(0); }}>
                <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="90">90</SelectItem>
                  <SelectItem value="120">120</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={(page + 1) * rowsPerPage >= filteredMembers.length}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
