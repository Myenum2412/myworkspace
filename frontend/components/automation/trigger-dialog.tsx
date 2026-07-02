"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusIcon, XIcon, Loader2Icon } from "lucide-react";
import { apiCall } from "@/app/automation/automation-interactive";

const triggerTypes = ["webhook", "schedule", "form_submission", "lead_created", "lead_updated", "lead_status_changed", "score_threshold", "email_received"];
const triggerStatuses = ["active", "inactive", "draft"];

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface TriggerFormData {
  name: string;
  type: string;
  description: string;
  workflowId: string;
  status: string;
  cooldownSeconds: string;
  config: string;
  conditions: Condition[];
}

const defaultForm: TriggerFormData = {
  name: "", type: "webhook", description: "", workflowId: "", status: "active",
  cooldownSeconds: "0", config: "{}", conditions: [],
};

const operators = ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than"];

interface TriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (trigger: Record<string, unknown>) => void;
  editData?: Record<string, unknown> | null;
}

export function TriggerDialog({ open, onOpenChange, onSuccess, editData }: TriggerDialogProps) {
  const [form, setForm] = useState<TriggerFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      const conds = (editData.conditions as Record<string, unknown>[]) || [];
      setForm({
        name: (editData.name as string) || "",
        type: (editData.type as string) || "webhook",
        description: (editData.description as string) || "",
        workflowId: (editData.workflowId as string) || "",
        status: (editData.status as string) || "active",
        cooldownSeconds: String((editData.cooldownSeconds as number) || 0),
        config: JSON.stringify((editData.config as Record<string, unknown>) || {}, null, 2),
        conditions: conds.map((c) => ({ field: (c.field as string) || "", operator: (c.operator as string) || "equals", value: String(c.value ?? "") })),
      });
    } else {
      setForm(defaultForm);
    }
    setError("");
  }, [editData, open]);

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.type) { setError("Type is required"); return; }
    setLoading(true);
    try {
      let parsedConfig: Record<string, unknown> = {};
      try { parsedConfig = JSON.parse(form.config || "{}"); } catch { setError("Config must be valid JSON"); setLoading(false); return; }

      const body = {
        name: form.name.trim(),
        type: form.type,
        description: form.description,
        workflowId: form.workflowId.trim() || null,
        status: form.status,
        cooldownSeconds: parseInt(form.cooldownSeconds) || 0,
        config: parsedConfig,
        conditions: form.conditions.filter((c) => c.field.trim()),
      };
      const url = editData ? `/api/automation/triggers/${editData.id}` : "/api/automation/triggers";
      const method = editData ? "PATCH" : "POST";
      const res = await apiCall(url, method, body);
      if (res.error) { setError(res.error); return; }
      onSuccess(res.data);
      onOpenChange(false);
    } catch {
      setError("Failed to save trigger");
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => setForm((p) => ({ ...p, conditions: [...p.conditions, { field: "", operator: "equals", value: "" }] }));
  const removeCondition = (i: number) => setForm((p) => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));
  const updateCondition = (i: number, key: "field" | "operator" | "value", value: string) =>
    setForm((p) => ({ ...p, conditions: p.conditions.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Trigger" : "Create Trigger"}</DialogTitle>
          <DialogDescription>Configure trigger conditions and settings.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="New lead webhook" />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Trigger description..." rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {triggerStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Workflow ID</Label>
              <Input value={form.workflowId} onChange={(e) => setForm((p) => ({ ...p, workflowId: e.target.value }))} placeholder="workflow-uuid" />
            </div>
            <div className="space-y-2">
              <Label>Cooldown (sec)</Label>
              <Input type="number" value={form.cooldownSeconds} onChange={(e) => setForm((p) => ({ ...p, cooldownSeconds: e.target.value }))} min={0} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Config (JSON)</Label>
            <Textarea value={form.config} onChange={(e) => setForm((p) => ({ ...p, config: e.target.value }))} rows={3} />
          </div>

          <div className="border-t" />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Conditions (optional)</Label>
              <Button size="sm" variant="outline" onClick={addCondition}><PlusIcon className="size-3 mr-1" /> Add Condition</Button>
            </div>
            {form.conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No conditions — trigger fires on all events of this type.</p>
            ) : (
              form.conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Field" value={c.field} onChange={(e) => updateCondition(i, "field", e.target.value)} />
                  <Select value={c.operator} onValueChange={(v) => updateCondition(i, "operator", v)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {operators.map((o) => <SelectItem key={o} value={o} className="capitalize">{o.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" placeholder="Value" value={c.value} onChange={(e) => updateCondition(i, "value", e.target.value)} />
                  <button onClick={() => removeCondition(i)} className="text-muted-foreground hover:text-destructive shrink-0"><XIcon className="size-4" /></button>
                </div>
              ))
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2Icon className="size-4 mr-1 animate-spin" />}
            {editData ? "Update Trigger" : "Create Trigger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
