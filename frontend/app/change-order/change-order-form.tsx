"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "@/lib/icons";

const STATUSES = ["Pending", "Approved", "Rejected", "Completed"];

type ChangeOrder = {
  id: string;
  orderNo: string;
  title: string;
  description: string;
  projectId?: string;
  projectName?: string;
  amount: number;
  status: string;
  requestedBy?: string;
  requestedByName?: string;
  reason?: string;
  createdAt: string;
  updatedAt?: string;
};

type ChangeOrderFormProps = {
  order?: ChangeOrder | null;
  onSave: (data: Omit<ChangeOrder, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
};

export function ChangeOrderForm({ order, onSave, onCancel }: ChangeOrderFormProps) {
  const [title, setTitle] = useState(order?.title || "");
  const [description, setDescription] = useState(order?.description || "");
  const [reason, setReason] = useState(order?.reason || "");
  const [amount, setAmount] = useState(String(order?.amount ?? ""));
  const [status, setStatus] = useState(order?.status || "Pending");
  const [saving, setSaving] = useState(false);
  const [projectId, setProjectId] = useState(order?.projectId || "");
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const res = await fetch("/api/projects-list", { credentials: "include" });
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setProjects(
            json.data.map((p: { id?: string; name?: string }) => ({
              id: p.id || "",
              name: p.name || "",
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    }
    fetchProjects();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !Number(amount)) return;
    setSaving(true);
    try {
      onSave({
        orderNo: order?.orderNo || "",
        title: title.trim(),
        description: description.trim(),
        projectId,
        projectName: projects.find((p) => p.id === projectId)?.name || "",
        amount: Number(amount) || 0,
        status,
        requestedByName: "",
        reason: reason.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 [&_input]:border-black [&_input]:bg-white [&_select>button]:border-black [&_select>button]:bg-white [&_textarea]:border-black [&_textarea]:bg-white"
    >
      <fieldset className="border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Change Order Details</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Change order title"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Amount (₹) *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the change"
              rows={3}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for the change"
              rows={2}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="w-32 h-10">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving || !title.trim() || !Number(amount)}
          className="w-32 h-10"
        >
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {order ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
}
