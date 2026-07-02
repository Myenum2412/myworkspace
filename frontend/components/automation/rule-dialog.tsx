"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, XIcon, Loader2Icon } from "lucide-react";
import { apiCall } from "@/app/automation/automation-interactive";

const triggerTypes = ["manual", "lead_created", "lead_updated", "status_changed", "score_changed", "form_submitted", "scheduled"];
const ruleStatuses = ["active", "inactive", "draft"];

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface Action {
  type: string;
  config: string;
}

interface RuleFormData {
  name: string;
  description: string;
  triggerType: string;
  status: string;
  priority: string;
  cooldownMinutes: string;
  conditions: Condition[];
  actions: Action[];
}

const defaultForm: RuleFormData = {
  name: "", description: "", triggerType: "manual", status: "active",
  priority: "0", cooldownMinutes: "0", conditions: [], actions: [],
};

const operators = ["equals", "not_equals", "contains", "not_contains", "greater_than", "less_than", "is_empty", "is_not_empty"];
const actionTypes = ["send_email", "send_sms", "update_field", "assign_lead", "change_status", "webhook", "add_tag", "create_task"];

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (rule: Record<string, unknown>) => void;
  editData?: Record<string, unknown> | null;
}

export function RuleDialog({ open, onOpenChange, onSuccess, editData }: RuleDialogProps) {
  const [form, setForm] = useState<RuleFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      const conds = (editData.conditions as Record<string, unknown>[]) || [];
      const acts = (editData.actions as Record<string, unknown>[]) || [];
      const trigger = (editData.trigger as Record<string, unknown>) || {};
      setForm({
        name: (editData.name as string) || "",
        description: (editData.description as string) || "",
        triggerType: (trigger.type as string) || "manual",
        status: (editData.status as string) || "active",
        priority: String((editData.priority as number) || 0),
        cooldownMinutes: String((editData.cooldownMinutes as number) || 0),
        conditions: conds.map((c) => ({ field: (c.field as string) || "", operator: (c.operator as string) || "equals", value: String(c.value ?? "") })),
        actions: acts.map((a) => ({ type: (a.type as string) || "", config: JSON.stringify(a.config || {}) })),
      });
    } else {
      setForm(defaultForm);
    }
    setError("");
  }, [editData, open]);

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description,
        status: form.status,
        priority: parseInt(form.priority) || 0,
        cooldownMinutes: parseInt(form.cooldownMinutes) || 0,
        trigger: { type: form.triggerType },
        conditions: form.conditions.filter((c) => c.field.trim()),
        actions: form.actions.filter((a) => a.type.trim()).map((a) => {
          try { return { type: a.type, config: JSON.parse(a.config || "{}") }; }
          catch { return { type: a.type, config: {} }; }
        }),
      };
      const url = editData ? `/api/automation/rules/${editData.id}` : "/api/automation/rules";
      const method = editData ? "PATCH" : "POST";
      const res = await apiCall(url, method, body);
      if (res.error) { setError(res.error); return; }
      onSuccess(res.data);
      onOpenChange(false);
    } catch {
      setError("Failed to save rule");
    } finally {
      setLoading(false);
    }
  };

  const addCondition = () => setForm((p) => ({ ...p, conditions: [...p.conditions, { field: "", operator: "equals", value: "" }] }));
  const removeCondition = (i: number) => setForm((p) => ({ ...p, conditions: p.conditions.filter((_, idx) => idx !== i) }));
  const updateCondition = (i: number, key: keyof Condition, value: string) =>
    setForm((p) => ({ ...p, conditions: p.conditions.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));

  const addAction = () => setForm((p) => ({ ...p, actions: [...p.actions, { type: "", config: "{}" }] }));
  const removeAction = (i: number) => setForm((p) => ({ ...p, actions: p.actions.filter((_, idx) => idx !== i) }));
  const updateAction = (i: number, key: keyof Action, value: string) =>
    setForm((p) => ({ ...p, actions: p.actions.map((a, idx) => idx === i ? { ...a, [key]: value } : a) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Rule" : "Create Rule"}</DialogTitle>
          <DialogDescription>Define rule conditions and actions.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Score > 80 leads" />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={form.triggerType} onValueChange={(v) => setForm((p) => ({ ...p, triggerType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {triggerTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Rule description..." rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ruleStatuses.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Input type="number" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))} min={0} max={100} />
            </div>
            <div className="space-y-2">
              <Label>Cooldown (min)</Label>
              <Input type="number" value={form.cooldownMinutes} onChange={(e) => setForm((p) => ({ ...p, cooldownMinutes: e.target.value }))} min={0} />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Conditions</Label>
              <Button size="sm" variant="outline" onClick={addCondition}><PlusIcon className="size-3 mr-1" /> Add Condition</Button>
            </div>
            {form.conditions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No conditions — rule always triggers.</p>
            ) : (
              form.conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Field (e.g. lead.score)" value={c.field} onChange={(e) => updateCondition(i, "field", e.target.value)} />
                  <Select value={c.operator} onValueChange={(v) => updateCondition(i, "operator", v)}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
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

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Actions</Label>
              <Button size="sm" variant="outline" onClick={addAction}><PlusIcon className="size-3 mr-1" /> Add Action</Button>
            </div>
            {form.actions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No actions defined.</p>
            ) : (
              form.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select value={a.type} onValueChange={(v) => updateAction(i, "type", v)}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="Action type" /></SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" placeholder='Config JSON (e.g. {"email":"template_1"})' value={a.config} onChange={(e) => updateAction(i, "config", e.target.value)} />
                  <button onClick={() => removeAction(i)} className="text-muted-foreground hover:text-destructive shrink-0"><XIcon className="size-4" /></button>
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
            {editData ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Separator() {
  return <div className="border-t" />;
}
