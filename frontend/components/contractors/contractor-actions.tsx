"use client";
import { useState } from "react";
import type { Contractor } from "@/app/contractors/columns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import { Loader2, Plus, Trash2 } from "@/lib/icons";

const CONTRACTOR_TYPES = ["Individual", "Company", "Subcontractor"];
const MAIN_TRADES = [
  "Civil",
  "Electrical",
  "Plumbing",
  "Carpentry",
  "Painting",
  "Mason",
  "Steel",
  "HVAC",
  "Roofing",
  "Flooring",
  "Other",
];

type EditProps = {
  contractor: Contractor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContractorUpdated: (contractor: Contractor) => void;
};

export function ContractorEditDialog({
  contractor,
  open,
  onOpenChange,
  onContractorUpdated,
}: EditProps) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Contractor>>({});

  function initForm() {
    if (contractor) setForm({ ...contractor });
  }

  async function handleSave() {
    if (!contractor) return;
    setSaving(true);
    const res = await apiFetch(`/api/contractors/${contractor.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json();
    if (res.ok && result.data) {
      onContractorUpdated(result.data);
      onOpenChange(false);
    }
    setSaving(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) initForm();
        if (!o) onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Contractor</DialogTitle>
          <DialogDescription>Update contractor details.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input
                  value={form.fullName || ""}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Company Name</Label>
                <Input
                  value={form.companyName || ""}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Mobile</Label>
                <Input
                  value={form.mobileNumber || ""}
                  onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input
                  value={form.emailAddress || ""}
                  onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Input
                  value={form.country || ""}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contractor Type</Label>
                <Select
                  value={form.contractorType || ""}
                  onValueChange={(v) =>
                    setForm({ ...form, contractorType: v as Contractor["contractorType"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTOR_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Main Trade</Label>
                <Select
                  value={form.mainTrade || ""}
                  onValueChange={(v) => setForm({ ...form, mainTrade: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MAIN_TRADES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Years of Experience</Label>
                <Input
                  value={form.yearsOfExperience || ""}
                  onChange={(e) => setForm({ ...form, yearsOfExperience: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Number of Workers</Label>
                <Input
                  value={form.numberOfWorkers || ""}
                  onChange={(e) => setForm({ ...form, numberOfWorkers: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Insurance Available</Label>
                <Select
                  value={form.insuranceAvailable || ""}
                  onValueChange={(v) => setForm({ ...form, insuranceAvailable: v as "Yes" | "No" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={form.status || "Active"}
                  onValueChange={(v) => setForm({ ...form, status: v as "Active" | "Inactive" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="border p-4 space-y-4">
              <legend className="text-sm font-semibold px-2">Emergency Contacts</legend>
              {form.emergencyContacts?.map((c, i) => (
                <div key={i} className="rounded-sm border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Contact {i + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        const updated = form.emergencyContacts?.filter((_, idx) => idx !== i);
                        setForm({ ...form, emergencyContacts: updated });
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Name *</Label>
                      <Input
                        value={c.name}
                        onChange={(e) => {
                          const updated = [...(form.emergencyContacts || [])];
                          updated[i] = { ...updated[i], name: e.target.value };
                          setForm({ ...form, emergencyContacts: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Phone *</Label>
                      <Input
                        value={c.phoneNumber}
                        onChange={(e) => {
                          const updated = [...(form.emergencyContacts || [])];
                          updated[i] = { ...updated[i], phoneNumber: e.target.value };
                          setForm({ ...form, emergencyContacts: updated });
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={c.email || ""}
                        onChange={(e) => {
                          const updated = [...(form.emergencyContacts || [])];
                          updated[i] = { ...updated[i], email: e.target.value };
                          setForm({ ...form, emergencyContacts: updated });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const updated = [
                    ...(form.emergencyContacts || []),
                    { name: "", phoneNumber: "", email: "" },
                  ];
                  setForm({ ...form, emergencyContacts: updated });
                }}
              >
                <Plus className="mr-2" />
                Add Contact
              </Button>
            </fieldset>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 animate-spin" /> Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
