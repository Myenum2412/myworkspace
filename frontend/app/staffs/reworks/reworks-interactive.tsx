"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import Stats07 from "@/components/stats-07";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  EyeIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "@/lib/icons";

type RevisionItem = {
  id: number;
  _id?: string;
  project: string;
  rfiNumber: string;
  jobNumber: string;
  jobName: string;
  elements: string;
  responseDate: string;
  impactTask: boolean;
  impactedTaskId: string;
  impactedTaskName: string;
  description: string;
  numberSheets: number;
  questions: string;
  attachment: string;
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
  const [projects, setProjects] = useState<string[]>([]);
  const [tasks, setTasks] = useState<{ id: string; title: string }[]>([]);

  const [form, setForm] = useState({
    project: "",
    rfiNumber: "",
    jobNumber: "",
    jobName: "",
    elements: "",
    responseDate: "",
    impactTask: false,
    impactedTaskId: "",
    description: "",
    numberSheets: 0,
    questions: "",
    attachment: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/staffs/reworks")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setItems(d.revisions || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/staffs/projects").then((r) => r.json()),
      fetch("/api/staffs/tasks").then((r) => r.json()),
    ])
      .then(([p, t]) => {
        if (cancelled) return;
        setProjects((p.initialProjects || []).map((x: { name: string }) => x.name));
        setTasks(
          (t.initialTasks || []).map((x: { id: string; title: string }) => ({
            id: x.id,
            title: x.title,
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
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
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  function resetForm() {
    setForm({
      project: "",
      rfiNumber: "",
      jobNumber: "",
      jobName: "",
      elements: "",
      responseDate: "",
      impactTask: false,
      impactedTaskId: "",
      description: "",
      numberSheets: 0,
      questions: "",
      attachment: "",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAdd() {
    if (!form.description.trim()) return;
    const newItem: RevisionItem = {
      id: Math.max(0, ...items.map((i) => i.id)) + 1,
      project: form.project.trim(),
      rfiNumber: form.rfiNumber.trim(),
      jobNumber: form.jobNumber.trim(),
      jobName: form.jobName.trim(),
      elements: form.elements.trim(),
      responseDate: form.responseDate,
      impactTask: form.impactTask,
      impactedTaskId: form.impactTask ? form.impactedTaskId : "",
      impactedTaskName: form.impactTask
        ? tasks.find((t) => t.id === form.impactedTaskId)?.title || ""
        : "",
      description: form.description.trim(),
      numberSheets: Number(form.numberSheets) || 0,
      questions: form.questions.trim(),
      attachment: form.attachment.trim(),
      selectedFiles: "",
      remarks: "",
      status: "InCompleted",
    };
    setItems((prev) => [...prev, newItem]);
    setAddOpen(false);
    resetForm();
  }

  function handleDelete(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          !searchQuery.trim() ||
          i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.rfiNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.jobName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [items, searchQuery],
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

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) updateField("attachment", file.name);
  };

  return (
    <main className="flex flex-1 flex-col gap-0 p-4 sm:p-6">
      {loading ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Header */}
          <PageHeader
            className="mb-4 sm:mb-6"
            icon={<RotateCcwIcon className="size-6" />}
            title={<h1>Revisions</h1>}
            subtitle={
              <p>
                {items.length} {items.length === 1 ? "item" : "items"} total
              </p>
            }
            search={
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
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            }
            actions={
              <Button
                size="sm"
                onClick={() => setAddOpen(true)}
                className="gap-2 shrink-0 touch-target"
              >
                <PlusIcon className="size-4" />
                Add Revision
              </Button>
            }
          />

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
                  type="button"
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
              { name: "Total Revisions", value: summary.total, subtitle: "All revision" },
              { name: "Completed", value: summary.completed, subtitle: "Done revision" },
              { name: "In Progress", value: summary.inCompleted, subtitle: "Pending revision" },
            ]}
          />

          {/* Table */}
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col sm:max-h-[calc(100vh-280px)] mt-4">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="table-premium w-full text-sm text-left" style={{ minWidth: 1500 }}>
                <thead className="sticky top-0 z-10 bg-primary">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-10 text-white">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      #
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Project
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      RFI #
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Job #
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Job Name
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Elements
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Response Required Date
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Impact Any Scheduled Task?
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Impacted Task
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Description
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      # Sheets
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Questions
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap text-white">
                      Attachment
                    </th>
                    <th className="text-left font-semibold px-4 py-3.5 whitespace-nowrap w-40 text-white">
                      Status
                    </th>
                    <th className="text-right font-semibold px-4 py-3.5 whitespace-nowrap w-24 text-white">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="text-center py-16 bg-white">
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
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selected.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                            aria-label={`Select item ${item.id}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {page * pageSize + index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.project || "—"}</td>
                        <td className="px-4 py-3 text-sm">{item.rfiNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm">{item.jobNumber || "—"}</td>
                        <td className="px-4 py-3 text-sm">{item.jobName || "—"}</td>
                        <td className="px-4 py-3 text-sm">{item.elements || "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {item.responseDate
                            ? new Date(item.responseDate).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={
                              item.impactTask
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }
                          >
                            {item.impactTask ? "Yes" : "No"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {item.impactedTaskName || item.impactedTaskId || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3 text-sm">{item.numberSheets}</td>
                        <td className="px-4 py-3 text-sm">{item.questions || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          {item.attachment ? (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <PaperclipIcon className="size-3.5" />
                              {item.attachment}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
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
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setViewItem(item)}
                            >
                              <EyeIcon className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setEditItem(item)}
                            >
                              <PencilIcon className="size-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(item.id)}
                            >
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
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    Rows per page:
                  </span>
                  <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
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
          <Dialog
            open={!!viewItem}
            onOpenChange={(open) => {
              if (!open) setViewItem(null);
            }}
          >
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Revision Details</DialogTitle>
              </DialogHeader>
              {viewItem && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Project</Label>
                      <p className="text-sm font-medium">{viewItem.project || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">RFI #</Label>
                      <p className="text-sm font-medium">{viewItem.rfiNumber || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Job #</Label>
                      <p className="text-sm">{viewItem.jobNumber || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Job Name</Label>
                      <p className="text-sm">{viewItem.jobName || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Elements</Label>
                      <p className="text-sm">{viewItem.elements || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Response Required Date
                      </Label>
                      <p className="text-sm">
                        {viewItem.responseDate
                          ? new Date(viewItem.responseDate).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Impact Any Scheduled Task?
                      </Label>
                      <p className="text-sm">{viewItem.impactTask ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Impacted Task</Label>
                      <p className="text-sm">
                        {viewItem.impactTask
                          ? viewItem.impactedTaskName || viewItem.impactedTaskId
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm font-medium">{viewItem.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Number of Sheets</Label>
                      <p className="text-sm">{viewItem.numberSheets}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Attachment</Label>
                      <p className="text-sm">{viewItem.attachment || "—"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Questions</Label>
                    <p className="text-sm">{viewItem.questions || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Badge className={statusStyles[viewItem.status]}>{viewItem.status}</Badge>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewItem(null)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog
            open={!!editItem}
            onOpenChange={(open) => {
              if (!open) setEditItem(null);
            }}
          >
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Revision</DialogTitle>
              </DialogHeader>
              {editItem && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Project</Label>
                      <Select
                        value={editItem.project}
                        onValueChange={(val) => setEditItem({ ...editItem, project: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>RFI #</Label>
                      <Input
                        value={editItem.rfiNumber}
                        onChange={(e) => setEditItem({ ...editItem, rfiNumber: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Job #</Label>
                      <Input
                        value={editItem.jobNumber}
                        onChange={(e) => setEditItem({ ...editItem, jobNumber: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Job Name</Label>
                      <Input
                        value={editItem.jobName}
                        onChange={(e) => setEditItem({ ...editItem, jobName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Elements</Label>
                    <Input
                      value={editItem.elements}
                      onChange={(e) => setEditItem({ ...editItem, elements: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Response Required Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-start font-normal"
                            onClick={(e) => e.preventDefault()}
                          >
                            <Calendar className="size-4" />
                            {editItem.responseDate
                              ? new Date(editItem.responseDate).toLocaleDateString()
                              : "Select date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarUI
                            mode="single"
                            selected={
                              editItem.responseDate ? new Date(editItem.responseDate) : undefined
                            }
                            onSelect={(d) =>
                              setEditItem({
                                ...editItem,
                                responseDate: d ? d.toISOString().slice(0, 10) : "",
                              })
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-2">
                      <Label>Number of Sheets</Label>
                      <Input
                        type="number"
                        min={0}
                        value={editItem.numberSheets}
                        onChange={(e) =>
                          setEditItem({ ...editItem, numberSheets: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Impact Any Scheduled Task?</Label>
                    <RadioGroup
                      value={editItem.impactTask ? "yes" : "no"}
                      onValueChange={(val) =>
                        setEditItem({
                          ...editItem,
                          impactTask: val === "yes",
                          impactedTaskId: val === "yes" ? editItem.impactedTaskId : "",
                        })
                      }
                      className="flex flex-row gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="yes" id={`edit-impact-yes-${editItem.id}`} />
                        <Label htmlFor={`edit-impact-yes-${editItem.id}`}>Yes</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="no" id={`edit-impact-no-${editItem.id}`} />
                        <Label htmlFor={`edit-impact-no-${editItem.id}`}>No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {editItem.impactTask && (
                    <div className="grid gap-2">
                      <Label>Select Task</Label>
                      <Select
                        value={editItem.impactedTaskId}
                        onValueChange={(val) => setEditItem({ ...editItem, impactedTaskId: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          {tasks.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      value={editItem.description}
                      onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Questions</Label>
                    <Textarea
                      value={editItem.questions}
                      onChange={(e) => setEditItem({ ...editItem, questions: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Attachment</Label>
                    <Input
                      value={editItem.attachment}
                      onChange={(e) => setEditItem({ ...editItem, attachment: e.target.value })}
                      placeholder="Attachment filename"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (editItem) {
                      setItems((prev) =>
                        prev.map((i) =>
                          i.id === editItem.id
                            ? {
                                ...editItem,
                                impactedTaskName: editItem.impactTask
                                  ? tasks.find((t) => t.id === editItem.impactedTaskId)?.title || ""
                                  : "",
                              }
                            : i,
                        ),
                      );
                      setEditItem(null);
                    }
                  }}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Dialog */}
          <Dialog
            open={addOpen}
            onOpenChange={(open) => {
              setAddOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Revision</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={form.project} onValueChange={(v) => updateField("project", v)}>
                      <SelectTrigger id="project">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rfiNumber">RFI #</Label>
                    <Input
                      id="rfiNumber"
                      value={form.rfiNumber}
                      onChange={(e) => updateField("rfiNumber", e.target.value)}
                      placeholder="Enter RFI number"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="jobNumber">Job #</Label>
                    <Input
                      id="jobNumber"
                      value={form.jobNumber}
                      onChange={(e) => updateField("jobNumber", e.target.value)}
                      placeholder="Enter job number"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="jobName">Job Name</Label>
                    <Input
                      id="jobName"
                      value={form.jobName}
                      onChange={(e) => updateField("jobName", e.target.value)}
                      placeholder="Enter job name"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="elements">Elements</Label>
                  <Input
                    id="elements"
                    value={form.elements}
                    onChange={(e) => updateField("elements", e.target.value)}
                    placeholder="Enter elements"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="responseDate">Response Required Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-start font-normal">
                          <Calendar className="size-4" />
                          {form.responseDate
                            ? new Date(form.responseDate).toLocaleDateString()
                            : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarUI
                          mode="single"
                          selected={form.responseDate ? new Date(form.responseDate) : undefined}
                          onSelect={(d) =>
                            updateField("responseDate", d ? d.toISOString().slice(0, 10) : "")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="numberSheets">Number of Sheets</Label>
                    <Input
                      id="numberSheets"
                      type="number"
                      min={0}
                      value={form.numberSheets}
                      onChange={(e) => updateField("numberSheets", Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Impact Any Scheduled Task?</Label>
                  <RadioGroup
                    value={form.impactTask ? "yes" : "no"}
                    onValueChange={(val) => updateField("impactTask", val === "yes")}
                    className="flex flex-row gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="yes" id="impact-yes" />
                      <Label htmlFor="impact-yes">Yes</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="no" id="impact-no" />
                      <Label htmlFor="impact-no">No</Label>
                    </div>
                  </RadioGroup>
                </div>
                {form.impactTask && (
                  <div className="grid gap-2">
                    <Label htmlFor="impactedTaskId">Select Task</Label>
                    <Select
                      value={form.impactedTaskId}
                      onValueChange={(v) => updateField("impactedTaskId", v)}
                    >
                      <SelectTrigger id="impactedTaskId">
                        <SelectValue placeholder="Select a task" />
                      </SelectTrigger>
                      <SelectContent>
                        {tasks.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Enter revision description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="questions">Questions</Label>
                  <Textarea
                    id="questions"
                    value={form.questions}
                    onChange={(e) => updateField("questions", e.target.value)}
                    placeholder="Enter questions"
                    rows={3}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="attachment">Attachment</Label>
                  <Input
                    ref={fileInputRef}
                    id="attachment"
                    type="file"
                    onChange={handleAttachment}
                  />
                  {form.attachment && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <PaperclipIcon className="size-3.5" />
                      {form.attachment}
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!form.description.trim()}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </main>
  );
}
