"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "@/lib/icons";
import { ROLES } from "@/lib/rbac";

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
  employmentType: string;
  branchName: string;
  joiningDate: string;
  registeredAt: string;
}

export default function MembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = session?.user?.role === ROLES.ORG_ADMIN;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchMembers = () => {
    setLoading(true);
    fetch("/api/orgmenu/members")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        (m.name || "").toLowerCase().includes(q) ||
        (m.email || "").toLowerCase().includes(q) ||
        (m.role || "").toLowerCase().includes(q) ||
        (m.companyName || "").toLowerCase().includes(q) ||
        (m.department || "").toLowerCase().includes(q) ||
        (m.designation || "").toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / rowsPerPage));
  const paginatedMembers = filteredMembers.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedMembers.map((m) => m.userId)));
    }
  };

  const allSelected = paginatedMembers.length > 0 && selectedIds.size === paginatedMembers.length;
  const hasActiveFilters = searchQuery.length > 0;

  const handleDelete = async (member: Member) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/orgmenu/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.userId }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
        setSelectedIds((prev) => {
          const n = new Set(prev);
          n.delete(member.userId);
          return n;
        });
      }
    } catch {}
    setDeleting(false);
    setDeleteTarget(null);
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2) || "U"
    );
  };

  const displayStatus = (s: string) => {
    if (!s) return "Offline";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatDate = (d: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
      <PageHeader
        className="mb-4 sm:mb-6"
        icon={<UsersIcon className="size-6" />}
        title={<h1>Members</h1>}
        subtitle={
          <p>
            {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
            {hasActiveFilters ? " found" : " total"}
          </p>
        }
        search={
          <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, role, department..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPage(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        }
        actions={
          <Button asChild className="gap-2 shrink-0 touch-target">
            <Link href="/orgmenu/members/invite">
              <PlusIcon className="size-4" /> Invite Member
            </Link>
          </Button>
        }
      />

      <div className="relative w-full mb-4 sm:hidden">
        <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, role, department..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9 h-10 border-0 shadow-none focus-visible:ring-0 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setPage(0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)]">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 1200 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                    className="border-white"
                  />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Name</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Company Name</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Email ID</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Phone</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Department</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Designation</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Role</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Status</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Registered</span>
                </th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-white">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-16 bg-white">
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
                            ? "Try adjusting your search"
                            : "Click 'Invite Member' to get started"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((m) => {
                  const selected = selectedIds.has(m.userId);
                  return (
                    <tr
                      key={m.userId}
                      className={`group border-b bg-white hover:bg-slate-50 transition-colors${selected ? " selected" : ""}`}
                    >
                      <td className="px-4 py-3 w-10">
                        <Checkbox
                          checked={selected}
                          onCheckedChange={() => toggleSelect(m.userId)}
                          className="border-black"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt={m.name}
                              className="size-8 rounded-sm object-cover ring-2 ring-background"
                            />
                          ) : (
                            <div className="size-8 rounded-sm flex items-center justify-center text-xs font-semibold bg-primary/10 text-primary">
                              {getInitials(m.name)}
                            </div>
                          )}
                          <span className="font-medium text-gray-900 whitespace-nowrap">
                            {m.name || "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{m.companyName || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{m.email || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{m.phone || "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {m.department ? (
                          <span className="inline-flex items-center rounded-sm bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                            {m.department}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800">
                          {m.designation || <span className="text-gray-300">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-sm border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-medium capitalize">
                          {m.role || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium ${
                            m.status === "online"
                              ? "bg-green-50 text-green-700"
                              : m.status === "away"
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-sm ${
                              m.status === "online"
                                ? "bg-green-500"
                                : m.status === "away"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                            }`}
                          />
                          {displayStatus(m.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-xs">{formatDate(m.registeredAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Rows per page:
              </span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(v) => {
                  setRowsPerPage(Number(v));
                  setPage(0);
                }}
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
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={(page + 1) * rowsPerPage >= filteredMembers.length}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Member</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email}) from
              the organization and send a termination email.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin mr-1" /> Terminating...
                </>
              ) : (
                "Terminate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
