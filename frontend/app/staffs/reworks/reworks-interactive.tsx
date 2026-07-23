"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcwIcon, PlusIcon, EyeIcon, PencilIcon, Trash2Icon, CheckCircleIcon, AlertCircleIcon, ListTodoIcon } from "lucide-react";
import Stats07 from "@/components/stats-07";

type ReworkItem = {
  id: number;
  description: string;
  selectedFiles: string;
  remarks: string;
  status: "Completed" | "InCompleted";
};

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  InCompleted: "bg-yellow-100 text-yellow-700",
};

export default function ReworksInteractive() {
  const [items, setItems] = useState<ReworkItem[]>([
    { id: 1, description: "Update dashboard UI colors", selectedFiles: "dashboard.tsx, theme.css", remarks: "Need client approval", status: "InCompleted" },
    { id: 2, description: "Fix login redirect issue", selectedFiles: "auth.ts", remarks: "Verified by QA", status: "Completed" },
    { id: 3, description: "Add pagination to reports", selectedFiles: "reports-table.tsx", remarks: "", status: "InCompleted" },
  ]);
  const [viewItem, setViewItem] = useState<ReworkItem | null>(null);
  const [editItem, setEditItem] = useState<ReworkItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newFiles, setNewFiles] = useState("");
  const [newRemarks, setNewRemarks] = useState("");

  function updateStatus(id: number, status: "Completed" | "InCompleted") {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  }

  function handleAdd() {
    if (!newDescription.trim()) return;
    const newItem: ReworkItem = {
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

  const summary = useMemo(() => {
    const completed = items.filter((i) => i.status === "Completed").length;
    const inCompleted = items.filter((i) => i.status === "InCompleted").length;
    return { total: items.length, completed, inCompleted };
  }, [items]);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RotateCcwIcon className="size-6" />
          <h1 className="text-2xl font-bold">Reworks</h1>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <PlusIcon className="size-4 mr-1" />
          Add Rework
        </Button>
      </div>

      <Stats07
        items={[
          { name: 'Total Reworks', value: summary.total, subtitle: 'All reworks' },
          { name: 'Completed', value: summary.completed, subtitle: 'Done reworks' },
          { name: 'In Progress', value: summary.inCompleted, subtitle: 'Pending reworks' },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcwIcon className="size-4" />
            Reworks ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-12">#</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Description</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Selected Files</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Remarks</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-40">Status</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No reworks found
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
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
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="InCompleted">InCompleted</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
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
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rework Details</DialogTitle>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Rework</DialogTitle>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Rework</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Enter rework description"
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
    </main>
  );
}
