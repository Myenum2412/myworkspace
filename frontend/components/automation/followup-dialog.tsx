"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2Icon } from "lucide-react";
import { apiCall } from "@/app/automation/automation-interactive";

const followUpTypes = ["email", "call", "meeting", "sms", "task", "linkedin_message"];
const followUpChannels = ["email", "phone", "sms", "linkedin", "whatsapp", "in_app"];
const followUpPriorities = ["low", "medium", "high", "urgent"];

interface FollowUpFormData {
  leadId: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  dueAt: string;
  assignedTo: string;
  channel: string;
}

const defaultForm: FollowUpFormData = {
  leadId: "", type: "email", subject: "", message: "", status: "pending",
  priority: "medium", dueAt: "", assignedTo: "", channel: "email",
};

interface FollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (followup: Record<string, unknown>) => void;
  editData?: Record<string, unknown> | null;
}

export function FollowUpDialog({ open, onOpenChange, onSuccess, editData }: FollowUpDialogProps) {
  const [form, setForm] = useState<FollowUpFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      setForm({
        leadId: (editData.leadId as string) || "",
        type: (editData.type as string) || "email",
        subject: (editData.subject as string) || "",
        message: (editData.message as string) || "",
        status: (editData.status as string) || "pending",
        priority: (editData.priority as string) || "medium",
        dueAt: (editData.dueAt as string) ? new Date(editData.dueAt as string).toISOString().split("T")[0] : "",
        assignedTo: (editData.assignedTo as string) || "",
        channel: (editData.channel as string) || "email",
      });
    } else {
      setForm(defaultForm);
    }
    setError("");
  }, [editData, open]);

  const handleSubmit = async () => {
    setError("");
    if (!form.leadId.trim()) { setError("Lead ID is required"); return; }
    if (!form.type) { setError("Type is required"); return; }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        leadId: form.leadId.trim(),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      };
      const url = editData ? `/api/automation/followups/${editData.id}` : "/api/automation/followups";
      const method = editData ? "PATCH" : "POST";
      const res = await apiCall(url, method, body);
      if (res.error) { setError(res.error); return; }
      onSuccess(res.data);
      onOpenChange(false);
    } catch {
      setError("Failed to save follow-up");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof FollowUpFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editData ? "Edit Follow-up" : "Schedule Follow-up"}</DialogTitle>
          <DialogDescription>Configure the follow-up details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead ID *</Label>
              <Input value={form.leadId} onChange={set("leadId")} placeholder="lead-uuid" />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {followUpTypes.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={set("subject")} placeholder="Follow-up subject" />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {followUpPriorities.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={form.channel} onValueChange={(v) => setForm((p) => ({ ...p, channel: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {followUpChannels.map((c) => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueAt} onChange={set("dueAt")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Input value={form.assignedTo} onChange={set("assignedTo")} placeholder="User ID" />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea value={form.message} onChange={set("message")} placeholder="Follow-up message content..." rows={3} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2Icon className="size-4 mr-1 animate-spin" />}
            {editData ? "Update" : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
