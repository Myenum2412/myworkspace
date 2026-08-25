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
import { Loader2, PlusIcon, Trash2Icon } from "@/lib/icons";
import type { ChangeOrder, DrawingChangeRow, WeightDifferenceRow } from "./columns";

const STATUSES = ["Pending", "Approved", "Rejected", "Completed"];
const BAR_GRADES = ["Black", "Epoxy"] as const;

function newId() {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

  const [coNumber, setCoNumber] = useState(order?.coNumber || order?.orderNo || "");
  const [jobNumber, setJobNumber] = useState(order?.jobNumber || "");
  const [client, setClient] = useState(order?.client || "");
  const [substructureRevised, setSubstructureRevised] = useState(order?.substructureRevised || "");
  const [contractDrawingReference, setContractDrawingReference] = useState(
    order?.contractDrawingReference || "",
  );
  const [placingDrawingReference, setPlacingDrawingReference] = useState(
    order?.placingDrawingReference || "",
  );
  const [responsibleForRevision, setResponsibleForRevision] = useState(
    order?.responsibleForRevision || "",
  );
  const [revisedFor, setRevisedFor] = useState(order?.revisedFor || "");
  const [drawingChanges, setDrawingChanges] = useState<DrawingChangeRow[]>(
    order?.drawingChanges || [],
  );
  const [weightDifferences, setWeightDifferences] = useState<WeightDifferenceRow[]>(
    order?.weightDifferences || [],
  );

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
        orderNo: order?.orderNo || coNumber.trim() || `CO-${Date.now().toString().slice(-6)}`,
        title: title.trim(),
        description: description.trim(),
        projectId,
        projectName: projects.find((p) => p.id === projectId)?.name || "",
        amount: Number(amount) || 0,
        status,
        requestedByName: "",
        reason: reason.trim(),
        coNumber: coNumber.trim(),
        jobNumber: jobNumber.trim(),
        client: client.trim(),
        substructureRevised: substructureRevised.trim(),
        contractDrawingReference: contractDrawingReference.trim(),
        placingDrawingReference: placingDrawingReference.trim(),
        responsibleForRevision: responsibleForRevision.trim(),
        revisedFor: revisedFor.trim(),
        drawingChanges,
        weightDifferences,
      });
    } finally {
      setSaving(false);
    }
  }

  function addDrawingRow() {
    setDrawingChanges((prev) => [
      ...prev,
      { id: newId(), dwgNo: "", barNo: "", description: "", revHours: "" },
    ]);
  }

  function updateDrawingRow(id: string, patch: Partial<DrawingChangeRow>) {
    setDrawingChanges((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addWeightRow() {
    setWeightDifferences((prev) => [
      ...prev,
      {
        id: newId(),
        dwgNo: "",
        barNo: "",
        weightNew: "",
        weightOld: "",
        barGrade: "",
        totalCount: "",
      },
    ]);
  }

  function updateWeightRow(id: string, patch: Partial<WeightDifferenceRow>) {
    setWeightDifferences((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 [&_input]:border-black [&_input]:bg-white [&_select>button]:border-black [&_select>button]:bg-white"
    >
      <fieldset className="border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Change Order Details</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Co #</Label>
            <Input value={coNumber} onChange={(e) => setCoNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Job #</Label>
            <Input value={jobNumber} onChange={(e) => setJobNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Client</Label>
            <Input value={client} onChange={(e) => setClient(e.target.value)} />
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
            <Label className="text-xs text-muted-foreground">Substructure Revised</Label>
            <Input
              value={substructureRevised}
              onChange={(e) => setSubstructureRevised(e.target.value)}
              placeholder="e.g., Yes/No or detail"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Contract Drawing Reference</Label>
            <Input
              value={contractDrawingReference}
              onChange={(e) => setContractDrawingReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Placing Drawing Reference</Label>
            <Input
              value={placingDrawingReference}
              onChange={(e) => setPlacingDrawingReference(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Responsible for Revision</Label>
            <Input
              value={responsibleForRevision}
              onChange={(e) => setResponsibleForRevision(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Revised For</Label>
            <Input value={revisedFor} onChange={(e) => setRevisedFor(e.target.value)} />
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
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 pt-2">
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the change"
              rows={3}
              className="w-full border border-black bg-white rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Reason</Label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for the change"
              rows={2}
              className="w-full border border-black bg-white rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </fieldset>

      {/* Drawing Changes Details */}
      <fieldset className="border p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Drawing Changes Details</legend>
        <div className="overflow-x-auto">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 720 }}>
            <thead className="bg-primary text-white">
              <tr>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Dwg No</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Bar No</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Description</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                  Rev Time (Hrs)
                </th>
                <th className="text-right font-semibold px-3 py-2 whitespace-nowrap w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {drawingChanges.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-sm text-muted-foreground">
                    No drawing changes yet
                  </td>
                </tr>
              ) : (
                drawingChanges.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200">
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.dwgNo}
                        onChange={(e) => updateDrawingRow(row.id, { dwgNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.barNo}
                        onChange={(e) => updateDrawingRow(row.id, { barNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.description}
                        onChange={(e) => updateDrawingRow(row.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={row.revHours}
                        onChange={(e) => updateDrawingRow(row.id, { revHours: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setDrawingChanges((prev) => prev.filter((r) => r.id !== row.id))
                        }
                      >
                        <Trash2Icon className="size-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addDrawingRow}>
          <PlusIcon className="size-4" /> Add Row
        </Button>
      </fieldset>

      {/* Weight Difference Summary */}
      <fieldset className="border p-4 space-y-3">
        <legend className="text-sm font-semibold px-2">Weight Difference Summary</legend>
        <div className="overflow-x-auto">
          <table className="table-premium w-full text-sm text-left" style={{ minWidth: 900 }}>
            <thead className="bg-primary text-white">
              <tr>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Dwg #</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Bar #</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Weight New</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Weight Old</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">Bar Grade</th>
                <th className="text-left font-semibold px-3 py-2 whitespace-nowrap">
                  Total Count Value
                </th>
                <th className="text-right font-semibold px-3 py-2 whitespace-nowrap w-16">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {weightDifferences.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-sm text-muted-foreground">
                    No weight differences yet
                  </td>
                </tr>
              ) : (
                weightDifferences.map((row) => (
                  <tr key={row.id} className="border-b border-gray-200">
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.dwgNo}
                        onChange={(e) => updateWeightRow(row.id, { dwgNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={row.barNo}
                        onChange={(e) => updateWeightRow(row.id, { barNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={row.weightNew}
                        onChange={(e) => updateWeightRow(row.id, { weightNew: e.target.value })}
                        placeholder="New"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={row.weightOld}
                        onChange={(e) => updateWeightRow(row.id, { weightOld: e.target.value })}
                        placeholder="Old"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={row.barGrade}
                        onValueChange={(val) =>
                          updateWeightRow(row.id, {
                            barGrade: val as WeightDifferenceRow["barGrade"],
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {BAR_GRADES.map((b) => (
                            <SelectItem key={b} value={b}>
                              {b}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        min="0"
                        value={row.totalCount}
                        onChange={(e) => updateWeightRow(row.id, { totalCount: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setWeightDifferences((prev) => prev.filter((r) => r.id !== row.id))
                        }
                      >
                        <Trash2Icon className="size-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addWeightRow}>
          <PlusIcon className="size-4" /> Add Row
        </Button>
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
