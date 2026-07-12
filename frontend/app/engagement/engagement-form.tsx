"use client"
import { useState } from "react";
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
import { Loader2, X } from "lucide-react";

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
  const [date, setDate] = useState(engagement?.date || new Date().toISOString().split("T")[0]);
  const [customerName, setCustomerName] = useState(engagement?.customerName || "");
  const [contact, setContact] = useState(engagement?.contact || "");
  const [source, setSource] = useState(engagement?.source || "");
  const [status, setStatus] = useState(engagement?.status || "New");
  const [assignedTo, setAssignedTo] = useState(engagement?.assignedTo || "");
  const [followUpDate, setFollowUpDate] = useState(engagement?.followUpDate || "");
  const [remarks, setRemarks] = useState(engagement?.remarks || "");
  const [saving, setSaving] = useState(false);

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {engagement ? "Edit Engagement" : "New Engagement"}
        </h3>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerName">Customer Name *</Label>
          <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact">Contact</Label>
          <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger id="source">
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assigned To</Label>
          <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Person name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="followUpDate">Follow-up Date</Label>
          <Input id="followUpDate" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks</Label>
        <textarea
          id="remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Any notes or remarks..."
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || !customerName.trim()}>
          {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
          {engagement ? "Update" : "Save"}
        </Button>
      </div>
    </form>
  );
}
