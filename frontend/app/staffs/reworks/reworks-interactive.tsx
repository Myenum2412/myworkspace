"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RotateCcwIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  Trash2Icon,
  ChevronLeft,
  ChevronRight,
  SearchIcon,
  XIcon,
} from "lucide-react";
import Stats07 from "@/components/stats-07";

type RevisionItem = {
  id: number;
  _id?: string;
  description: string;
  selectedFiles: string;
  remarks: string;
  status: "Completed" | "InCompleted";
};

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  InCompleted: "bg-yellow-100 text-yellow-700",
};

const PAGE_SIZE_OPTIONS = [30, 60, 90, 120] as const;

export default function RevisionsInteractive() {
  const [items, setItems] = useState<RevisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [viewItem, setViewItem] = useState<RevisionItem | null>(null);
  const [editItem, setEditItem] = useState<RevisionItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newFiles, setNewFiles] = useState("");
  const [newRemarks, setNewRemarks] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staffs/reworks")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.revisions || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  function handleAdd() {
    if (!newDescription.trim()) return;
    const newItem: RevisionItem = {
      id: Math.max(0, ...items.map((i) => i.id)) + 1,
      description: newDescription.trim(),
      selectedFiles: newFiles.trim(),
      remarks: newRemarks.trim(),
      status: "InCompleted",
    };
    setItems((prev) => [...prev, newItem]);
    setAddOpen(false);
    setNewDescription("");
    setNewFiles("");
    setNewRemarks("");
  }

  function handleDelete(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = useMemo(() =>
    items.filter((i) =>
      !searchQuery.trim() ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.selectedFiles.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.remarks.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [items, searchQuery]
  );

  const paginated = useMemo(() => {
    const start = page * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const allSelected = paginated.length > 0 && selected.size === paginated.length;

  const handlePageSizeChange = useCallback((value: string) => {
    setPageSize(Number(value));
    setPage(0);
  }, []);

  const summary = useMemo(() => {
    const completed = items.filter((i) => i.status === "Completed").length;
    const inCompleted = items.filter((i) => i.status === "InCompleted").length;
    return { total: items.length, completed, inCompleted };
  }, [items]);

  return (
    <main className="flex flex-1 flex-col gap-0 p-4 sm:p-6">
      {loading ? (
        <div className="flex flex-1 items-center justify-center p-8"><div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>
      ) : (
      <>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div className="flex items-center justify-center size-10 rounded-sm bg-primary/10 shrink-0">
            <RotateCcwIcon className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">Revisions</h1>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} total
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

        <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2 shrink-0 touch-target">
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

      <Stats07
        items={[
          { name: 'Total Revisions', value: summary.total, subtitle: 'All revision' },
          { name: 'Completed', value: summary.completed, subtitle: 'Done revision' },
          { name: 'In Progress', value: summary.inCompleted, subtitle: 'Pending revision' },
        ]}
      />

      {/* Table */}
      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)] rounded-lg mt-4">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 750 }}>
            <thead className="sticky top-0 z-10 bg-primary">
              <tr>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10 text-white">
                  <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                </th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">#</th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">Description</th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">Selected Files</th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">Remarks</th>
                <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-40 text-white">Status</th>
                <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-24 text-white">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 bg-white">
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
                paginated.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select item ${item.id}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{page * pageSize + index + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.description}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.selectedFiles || "—"}
                    </td>
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
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewItem(item)}>
                          <EyeIcon className="size-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditItem(item)}>
                          <PencilIcon className="size-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(item.id)}>
                          <Trash2Icon className="size-4 text-muted-foreground" />
                        </Button>
                      </div>
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
              : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Rows per page:</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
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
                disabled={(page + 1) * pageSize >= filtered.length}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Revision Details</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm font-medium">{viewItem.description}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Selected Files</Label>
                <p className="text-sm font-mono">{viewItem.selectedFiles || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Remarks</Label>
                <p className="text-sm">{viewItem.remarks || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Badge className={statusStyles[viewItem.status]}>{viewItem.status}</Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Revision</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={editItem.description}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Selected Files</Label>
                <Input
                  value={editItem.selectedFiles}
                  onChange={(e) => setEditItem({ ...editItem, selectedFiles: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Remarks</Label>
                <Textarea
                  value={editItem.remarks}
                  onChange={(e) => setEditItem({ ...editItem, remarks: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select
                  value={editItem.status}
                  onValueChange={(val) =>
                    setEditItem({ ...editItem, status: val as "Completed" | "InCompleted" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="InCompleted">InCompleted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => {
              if (editItem) {
                setItems((prev) => prev.map((i) => (i.id === editItem.id ? editItem : i)));
                setEditItem(null);
              }
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Revision</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter revision description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="files">Selected Files</Label>
              <Input
                id="files"
                value={newFiles}
                onChange={(e) => setNewFiles(e.target.value)}
                placeholder="e.g., file1.tsx, file2.css"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={newRemarks}
                onChange={(e) => setNewRemarks(e.target.value)}
                placeholder="Optional remarks"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newDescription.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}
    </main>
  );
}
