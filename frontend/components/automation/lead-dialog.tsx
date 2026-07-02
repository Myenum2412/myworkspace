"use client";

import { useState, useEffect, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  UserIcon, MailIcon, PhoneIcon, Building2Icon, BriefcaseIcon,
  GlobeIcon, BarChart3Icon, UserCheckIcon, TagsIcon, FileTextIcon,
  Loader2Icon, TargetIcon,
} from "lucide-react";
import { apiCall } from "@/app/automation/automation-interactive";

const leadSources = [
  { value: "manual", label: "Manual", icon: "user" },
  { value: "website", label: "Website", icon: "globe" },
  { value: "referral", label: "Referral", icon: "users" },
  { value: "linkedin", label: "LinkedIn", icon: "briefcase" },
  { value: "facebook", label: "Facebook", icon: "globe" },
  { value: "instagram", label: "Instagram", icon: "globe" },
  { value: "whatsapp", label: "WhatsApp", icon: "message" },
  { value: "email", label: "Email", icon: "mail" },
  { value: "call", label: "Call", icon: "phone" },
  { value: "other", label: "Other", icon: "target" },
];

const leadStatusColours: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 border-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
  qualified: "bg-purple-100 text-purple-800 border-purple-200",
  proposal: "bg-orange-100 text-orange-800 border-orange-200",
  converted: "bg-green-100 text-green-800 border-green-200",
  lost: "bg-red-100 text-red-800 border-red-200",
};

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  source: string;
  status: string;
  score: string;
  assignedTo: string;
  tags: string;
  notes: string;
}

const defaultForm: LeadFormData = {
  name: "", email: "", phone: "", company: "", title: "",
  source: "manual", status: "new", score: "0", assignedTo: "", tags: "", notes: "",
};

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (lead: Record<string, unknown>) => void;
  editData?: Record<string, unknown> | null;
}

function FieldIcon({ icon }: { icon: ReactNode }) {
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground shrink-0">
      {icon}
    </div>
  );
}

export function LeadDialog({ open, onOpenChange, onSuccess, editData }: LeadDialogProps) {
  const [form, setForm] = useState<LeadFormData>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      setForm({
        name: (editData.name as string) || "",
        email: (editData.email as string) || "",
        phone: (editData.phone as string) || "",
        company: (editData.company as string) || "",
        title: (editData.title as string) || "",
        source: (editData.source as string) || "manual",
        status: (editData.status as string) || "new",
        score: String((editData.score as number) ?? 0),
        assignedTo: (editData.assignedTo as string) || "",
        tags: ((editData.tags as string[]) || []).join(", "),
        notes: (editData.notes as string) || "",
      });
    } else {
      setForm(defaultForm);
    }
    setError("");
  }, [editData, open]);

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.email.trim()) { setError("Email is required"); return; }
    setLoading(true);
    try {
      const body = {
        ...form,
        score: parseInt(form.score) || 0,
        name: form.name.trim(),
        email: form.email.trim(),
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      const url = editData ? `/api/automation/leads/${editData.id}` : "/api/automation/leads";
      const method = editData ? "PATCH" : "POST";
      const res = await apiCall(url, method, body);
      if (res.error) { setError(res.error); return; }
      onSuccess(res.data);
      onOpenChange(false);
    } catch {
      setError("Failed to save lead");
    } finally {
      setLoading(false);
    }
  };

  const set = (key: keyof LeadFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <TargetIcon className="size-5 text-primary" />
          </div>
          <div>
            <DialogTitle className="text-lg">{editData ? "Edit Lead" : "Add New Lead"}</DialogTitle>
            <DialogDescription>Fill in the lead information below.</DialogDescription>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Contact Information */}
          <Card className="border shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <UserIcon className="size-4" />
                Contact Information
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Full Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={form.name} onChange={set("name")} placeholder="John Doe" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email Address <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={form.email} onChange={set("email")} placeholder="john@example.com" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Phone Number</Label>
                  <div className="relative">
                    <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={form.phone} onChange={set("phone")} placeholder="+1 234 567 8900" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Job Title</Label>
                  <div className="relative">
                    <BriefcaseIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={form.title} onChange={set("title")} placeholder="CEO / Founder" className="pl-9" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company & Source */}
          <Card className="border shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Building2Icon className="size-4" />
                Company & Source
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Company</Label>
                  <div className="relative">
                    <Building2Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={form.company} onChange={set("company")} placeholder="Acme Inc" className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Lead Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                    <SelectTrigger className="pl-9 relative">
                      <GlobeIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((s) => (
                        <SelectItem key={s.value} value={s.value} className="capitalize">{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status & Scoring */}
          <Card className="border shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <BarChart3Icon className="size-4" />
                Status & Scoring
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(leadStatusColours).map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          <span className="flex items-center gap-2">
                            <span className={`inline-block size-2 rounded-full ${leadStatusColours[s].split(" ")[0]}`} />
                            {s}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.status && (
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded text-xs font-medium border ${leadStatusColours[form.status] || ""}`}>
                      {form.status}
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Lead Score</Label>
                  <div className="relative">
                    <BarChart3Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input type="number" value={form.score} onChange={set("score")} min={0} max={100} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Assigned To</Label>
                  <div className="relative">
                    <UserCheckIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={form.assignedTo} onChange={set("assignedTo")} placeholder="Assign user" className="pl-9" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags & Notes */}
          <Card className="border shadow-none">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <FileTextIcon className="size-4" />
                Additional Info
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tags</Label>
                <div className="relative">
                  <TagsIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input value={form.tags} onChange={set("tags")} placeholder="vip, hot, enterprise" className="pl-9" />
                </div>
                <p className="text-[10px] text-muted-foreground pl-1">Separate tags with commas</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes</Label>
                <Textarea value={form.notes} onChange={set("notes")} placeholder="Add any additional notes about this lead..." rows={3} className="resize-none" />
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <Loader2Icon className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="min-w-[120px]">
            {loading && <Loader2Icon className="size-4 mr-1.5 animate-spin" />}
            {editData ? "Update Lead" : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
