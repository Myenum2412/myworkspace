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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-sm font-medium">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customerName" className="text-sm font-medium">Customer Name *</Label>
          <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" required className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact" className="text-sm font-medium">Contact</Label>
          <Input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Phone or email" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source" className="text-sm font-medium">Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger id="source" className="h-10">
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
          <Label htmlFor="assignedTo" className="text-sm font-medium">Assigned To</Label>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger id="assignedTo" className="h-10">
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
          <Label htmlFor="followUpDate" className="text-sm font-medium">Follow-up Date</Label>
          <Input id="followUpDate" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="border-t pt-5">
        <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Status & Remarks</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="status" className="text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="h-10">
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
        <div className="mt-5 space-y-1.5">
          <Label htmlFor="remarks" className="text-sm font-medium">Notes</Label>
          <textarea
            id="remarks"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any notes or remarks..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
          />
        </div>
      </div>

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
