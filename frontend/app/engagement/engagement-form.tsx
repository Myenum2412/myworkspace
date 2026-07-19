"use client"
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const SOURCES = ["Website", "Referral", "Social Media", "Email", "Phone", "Walk-in", "Other"];
const STATUS_OPTIONS = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

type Engagement = {
  id: string;
  date: string;
  customerName: string;
  contact: string;
  source: string;
  status: string;
  assignedTo: string;
  followUpDate: string;
  remarks: string;
};

type EngagementFormProps = {
  engagement?: Engagement | null;
  onSave: (engagement: Omit<Engagement, "id">) => void;
  onCancel: () => void;
};

export function EngagementForm({ engagement, onSave, onCancel }: EngagementFormProps) {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [date, setDate] = useState(engagement?.date || new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState(engagement?.customerName || "");
  const [contact, setContact] = useState(engagement?.contact || "");
  const [source, setSource] = useState(engagement?.source || "");
  const [status, setStatus] = useState(engagement?.status || "New");
  const [assignedTo, setAssignedTo] = useState(engagement?.assignedTo || "");
  const [followUpDate, setFollowUpDate] = useState(engagement?.followUpDate || "");
  const [remarks, setRemarks] = useState(engagement?.remarks || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const list = d?.data || [];
        setEmployees(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) return;
    setSaving(true);
    try {
      onSave({
        date,
        customerName: customerName.trim(),
        contact: contact.trim(),
        source,
        status,
        assignedTo: assignedTo.trim(),
        followUpDate,
        remarks: remarks.trim(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="rounded-xl border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Customer Details</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Customer Name *</Label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Contact</Label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Assigned To</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Follow-up Date</Label>
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border p-4 space-y-4">
        <legend className="text-sm font-semibold px-2">Status & Remarks</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any notes or remarks..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
          />
        </div>
      </fieldset>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10 px-5">Cancel</Button>
        <Button type="submit" disabled={saving || !customerName.trim()} className="h-10 px-5">
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {engagement ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
}
