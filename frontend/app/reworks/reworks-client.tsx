"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ReworkItem = {
  id: number;
  description: string;
  selectedFiles: string;
  remarks: string;
  status: "Completed" | "InCompleted";
};

const initialData: ReworkItem[] = [
  { id: 1, description: "Update dashboard UI colors", selectedFiles: "dashboard.tsx, theme.css", remarks: "Need client approval", status: "InCompleted" },
  { id: 2, description: "Fix login redirect issue", selectedFiles: "auth.ts", remarks: "Verified by QA", status: "Completed" },
  { id: 3, description: "Add pagination to reports", selectedFiles: "reports-table.tsx", remarks: "", status: "InCompleted" },
];

const PAGE_SIZE_OPTIONS = [30, 60, 90, 120] as const;

export default function ReworksClient() {
  const [items, setItems] = useState<ReworkItem[]>(initialData);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(30);

  function toggleSelect(id: number) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((i) => i.id)));
    }
  }

  function updateStatus(id: number, status: "Completed" | "InCompleted") {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  const filtered = items.filter((i) =>
    !searchQuery.trim() ||
    i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.selectedFiles.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.remarks.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginated = filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const allSelected = paginated.length > 0 && selected.size === paginated.length;

  return (
    <main className="flex flex-1 flex-col gap-0 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div className="flex items-center justify-center size-10 rounded-sm bg-primary/10 shrink-0">
            <RotateCcwIcon className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Revision</h1>
            <p className="text-sm text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-md mx-auto px-4 hidden sm:block">
          <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder=""
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 border-0 shadow-none focus-visible:ring-0 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        </div>

        <Button size="sm" className="gap-2 shrink-0 touch-target">
          <PlusIcon className="size-4" />
          Add Revision
        </Button>
      </div>

      {/* Search (mobile) */}
      <div className="relative w-full mb-4 sm:hidden">
        <div className="relative bg-white border border-gray-200 rounded-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder=""
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-0 shadow-none focus-visible:ring-0 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)] rounded-lg">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 750 }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" className="border-white" />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">S.No</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Description</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Selected Files</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap">
                  <span className="text-gray-800">Remarks</span>
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-40">
                  <span className="text-gray-800">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 bg-white">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center justify-center size-12 rounded-sm bg-muted">
                        <RotateCcwIcon className="size-6 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {searchQuery ? "No items match your search" : "No revisions yet"}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {searchQuery
                            ? "Try adjusting your search criteria"
                            : "Click 'Add Revision' to get started"}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select item ${item.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-muted-foreground">{item.id}</td>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.selectedFiles}</td>
                    <td className="px-4 py-3 text-sm">{item.remarks || "—"}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.status}
                        onValueChange={(val) =>
                          updateStatus(item.id, val as "Completed" | "InCompleted")
                        }
                      >
                        <SelectTrigger
                          className={`h-8 w-36 ${item.status === "Completed" ? "text-green-700" : "text-yellow-700"}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="InCompleted">InCompleted</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <span className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? "0 items"
              : `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, filtered.length)} of ${filtered.length}`}
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
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
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
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * rowsPerPage >= filtered.length}
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
