"use client";

import { useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLES, isAdminRole } from "@/lib/rbac";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  XIcon,
} from "lucide-react";
import type { MemberData, SortField, SortDir } from "./member-types";
import { MemberTableRow } from "./member-table-row";
import { useRouter } from "next/navigation";

type MembersListProps = {
  members: MemberData[];
  isSuperAdmin: boolean;
};

function getSortIcon(field: SortField, sortField: SortField, sortDir: SortDir) {
  if (sortField !== field) return <ArrowUpDownIcon className="size-3.5 text-muted-foreground/40" />;
  return sortDir === "asc"
    ? <ArrowUpIcon className="size-3.5 text-foreground" />
    : <ArrowDownIcon className="size-3.5 text-foreground" />;
}

export function MembersList({ members, isSuperAdmin }: MembersListProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentRole = (session?.user as Record<string, unknown>)?.role as string || "";
  const canManageMembers = isAdminRole(currentRole);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSort = useCallback((field: SortField) => {
    setSortDir((prev) => (sortField === field ? (prev === "asc" ? "desc" : "asc") : "asc"));
    setSortField(field);
  }, [sortField]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setPage(0);
  }, []);

  const handleSearchClear = useCallback(() => {
    setSearchQuery("");
    setPage(0);
  }, []);

  const filtered = useMemo(() => {
    let result = [...members];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q) ||
          m.orgName.toLowerCase().includes(q),
      );
    }

    result.sort((a, b) => {
      const aVal = ((a as Record<string, unknown>)[sortField] ?? "").toString().toLowerCase();
      const bVal = ((b as Record<string, unknown>)[sortField] ?? "").toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [members, searchQuery, sortField, sortDir]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page, rowsPerPage]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginated.map((m) => m.id)));
    }
  };

  const allSelected = paginated.length > 0 && selectedIds.size === paginated.length;
  const hasActiveFilters = !!searchQuery;

  const colSpan = isSuperAdmin ? 11 : 10;

  return (
    <main className="flex flex-1 flex-col gap-0 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div className="flex items-center justify-center size-10 rounded-sm bg-primary/10 shrink-0">
            <UsersIcon className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Members</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "member" : "members"}
              {isSuperAdmin ? " across all organizations" : ""}
              {hasActiveFilters ? " found" : " total"}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-md mx-auto px-4 hidden sm:block">
          <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder=""
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0 w-full"
            />
            {searchQuery && (
              <button
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>

        {canManageMembers && (
          <Button onClick={() => router.push("/orgmenu/members/invite")} className="gap-2 shrink-0 touch-target">
            <PlusIcon className="size-4" />
            Invite Member
          </Button>
        )}
      </div>

      <div className="relative w-full mb-4 sm:hidden">
        <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder=""
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10 border-0 shadow-none focus-visible:ring-0 w-full"
          />
          {searchQuery && (
            <button
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)]">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 950 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" className="border-white" />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <button onClick={() => handleSort("name")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                    Member {getSortIcon("name", sortField, sortDir)}
                  </button>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <button onClick={() => handleSort("email")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                    Email {getSortIcon("email", sortField, sortDir)}
                  </button>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <button onClick={() => handleSort("role")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                    Role {getSortIcon("role", sortField, sortDir)}
                  </button>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <button onClick={() => handleSort("provider")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                    Provider {getSortIcon("provider", sortField, sortDir)}
                  </button>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Verified</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <button onClick={() => handleSort("createdAt")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                    Joined {getSortIcon("createdAt", sortField, sortDir)}
                  </button>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <button onClick={() => handleSort("status")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                    Status {getSortIcon("status", sortField, sortDir)}
                  </button>
                </th>
                {isSuperAdmin && (
                  <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                    <button onClick={() => handleSort("orgName")} className="inline-flex items-center gap-1.5 text-white-800 transition-colors">
                      Organization {getSortIcon("orgName", sortField, sortDir)}
                    </button>
                  </th>
                )}
                <th className="text-right font-semibold px-4 py-3.5 text-white-800 whitespace-nowrap">
                  <span className="text-gray-800">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="text-center py-16 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
                        <UsersIcon className="size-6 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {hasActiveFilters ? "No members match your search" : "No members yet"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {hasActiveFilters
                            ? "Try adjusting your search criteria"
                            : "Click 'Invite Member' to get started"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <MemberTableRow
                    key={m.id}
                    member={m}
                    selected={selectedIds.has(m.id)}
                    onToggleSelect={toggleSelect}
                    onView={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    showOrgColumn={isSuperAdmin}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-white">
            <span className="text-sm text-muted-foreground">
              {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
