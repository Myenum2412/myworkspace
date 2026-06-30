"use client"
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PencilIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  FileIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from "lucide-react";
import type { Employee } from "./columns";

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  online: "bg-green-50 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  offline: "bg-gray-100 text-gray-700",
  break: "bg-gray-200 text-gray-700",
  on_leave: "bg-gray-200 text-gray-700",
  terminated: "bg-red-50 text-red-700",
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export function EmployeeDetailedView({ employee, onEdit }: { employee: Employee; onEdit?: (emp: Employee) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const fullName = employee.firstName && employee.lastName
    ? `${employee.firstName} ${employee.lastName}`
    : employee.name;

  const getVal = (key: string, fallback?: string | null) =>
    editing ? (formData[key] ?? fallback ?? "") : (fallback ?? "");

  const setVal = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const startEditing = () => {
    setFormData({});
    setError("");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setFormData({});
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: employee.id, ...formData }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update employee");
      }
      setEditing(false);
      onEdit?.(employee);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const FieldInput = ({ label, field, value, placeholder, className }: { label: string; field?: string; value?: string | null; placeholder?: string; className?: string }) => (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={getVal(field || "", value)}
        onChange={field && editing ? (e) => setVal(field, e.target.value) : undefined}
        readOnly={!editing || !field}
        placeholder={placeholder || ""}
        className={!editing ? "bg-muted/30" : ""}
      />
    </Field>
  );

  return (
    <div className="flex flex-col h-full">
      <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
        <DialogTitle className="flex items-center gap-2 text-xl">{fullName}</DialogTitle>
        <DialogDescription>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">{employee.role}</Badge>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[employee.status] || ""}`}>
              {employee.status.replace("_", " ")}
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
        <div className="space-y-12 max-w-4xl mx-auto">

          {/* Step 1: Profile */}
          <div className="space-y-8">
            <div className="flex gap-12 items-start">
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24 ring-2 ring-border">
                  <AvatarImage src={employee.avatar} alt={fullName} />
                  <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <FieldSet>
                  <FieldLegend>Basic Information</FieldLegend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldInput label="Display ID" value={employee.displayId || employee.id} />
                    <FieldInput label="First Name *" field="firstName" value={employee.firstName || fullName.split(" ")[0]} placeholder="First name" />
                    <FieldInput label="Last Name *" field="lastName" value={employee.lastName || fullName.split(" ").slice(1).join(" ") || null} placeholder="Last name" />
                    <FieldInput label="Nickname" field="nickname" value={employee.nickname} placeholder="Nickname" />
                    <FieldInput label="Email *" field="email" value={employee.email} placeholder="Email address" />
                    <FieldInput label="Department" field="department" value={employee.department} placeholder="Department" />
                    <FieldInput label="Location" field="location" value={employee.location || employee.branchName} placeholder="Location" />
                  </div>
                </FieldSet>
              </div>
            </div>
            <Separator />
          </div>

          {/* Step 2: Work Info */}
          <div className="space-y-8">
            <FieldSet>
              <FieldLegend>Work Information</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldInput label="Department" field="department" value={employee.department} placeholder="Department" />
                <FieldInput label="Location" field="location" value={employee.location || employee.branchName} placeholder="Location" />
                <FieldInput label="Designation" field="designation" value={employee.designation} placeholder="Designation" />
                <FieldInput label="Role" field="role" value={employee.role} placeholder="Role" />
                <FieldInput label="Employment Type" field="employmentType" value={employee.employmentType} placeholder="Employment type" />
                <FieldInput label="Status" field="status" value={employee.status} placeholder="Status" />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Joining Details</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldInput label="Branch Name" field="branchName" value={employee.branchName} placeholder="Branch" />
                <FieldInput label="Shift" field="shift" value={employee.shift} placeholder="Shift" />
                <FieldInput label="Date of Joining" field="joiningDate" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : null} placeholder="Joining date" />
                <FieldInput label="Source of Hire" field="sourceOfHire" value={employee.sourceOfHire} placeholder="Source" />
                <FieldInput label="Current Experience" field="currentExperience" value={employee.currentExperience} placeholder="Current experience" />
                <FieldInput label="Total Experience" field="totalExperience" value={employee.totalExperience} placeholder="Total experience" />
              </div>
            </FieldSet>
            <Separator />
          </div>

          {/* Step 3: Contact */}
          <div className="space-y-8">
            <FieldSet>
              <FieldLegend>Contact Details</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldInput label="Phone Number" field="phone" value={employee.phone} placeholder="Phone number" />
                <FieldInput label="Alternate Email" field="alternateEmail" value={employee.alternateEmail} placeholder="Alternate email" />
                <FieldInput label="Address" field="address" value={employee.address} placeholder="Street address" className="sm:col-span-2" />

                <FieldInput label="City" field="city" value={employee.city} placeholder="City" />
                <FieldInput label="State / Province" field="state" value={employee.state} placeholder="State/Province" />
                <FieldInput label="Postal Code" field="zipCode" value={employee.zipCode} placeholder="Postal code" />
                <FieldInput label="Country" field="country" value={employee.country} placeholder="Country" />
              </div>
            </FieldSet>
            <Separator />
          </div>

          {/* Step 5: Documents */}
          <div className="space-y-8">
            <FieldSet>
              <FieldLegend>Documents</FieldLegend>
              {employee.files && employee.files.length > 0 ? (
                <div className="space-y-2">
                  {employee.files.map((f) => (
                    <div key={f.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon className="size-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{f.name}</p>
                          <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer" title="View">
                            <ExternalLinkIcon className="size-4" />
                          </a>
                        </Button>
                        <Button variant="ghost" size="icon" className="size-8" asChild>
                          <a href={`/api/files/${f.id}?download=true`} title="Download">
                            <DownloadIcon className="size-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No documents uploaded.</p>
              )}
            </FieldSet>
            <Separator />
          </div>

          {/* Step 6: History */}
          <div className="space-y-8 pb-8">
            <FieldSet>
              <FieldLegend>Work Experience</FieldLegend>
              {employee.workExperience && employee.workExperience.length > 0 ? (
                <div className="space-y-4">
                  {employee.workExperience.map((row) => (
                    <div key={row.id} className="rounded-lg border bg-card p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FieldInput label="Company" value={row.company} />
                        <FieldInput label="Job Title" value={row.title} />
                        <FieldInput label="From Date" value={row.from} />
                        <FieldInput label="To Date" value={row.to} />
                      </div>
                      {row.description && <p className="text-sm text-muted-foreground mt-3">{row.description}</p>}
                      {row.relevant && <Badge variant="secondary" className="mt-2 text-[10px]">Relevant</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No work experience recorded.</p>
              )}
            </FieldSet>

            <Separator />

            <FieldSet>
              <FieldLegend>Education Details</FieldLegend>
              {employee.educationDetails && employee.educationDetails.length > 0 ? (
                <div className="space-y-4">
                  {employee.educationDetails.map((row) => (
                    <div key={row.id} className="rounded-lg border bg-card p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FieldInput label="Institute" value={row.institute} />
                        <FieldInput label="Degree/Diploma" value={row.degree} />
                        <FieldInput label="Specialization" value={row.specialization} />
                        <FieldInput label="Date of Completion" value={row.completionDate} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No education details recorded.</p>
              )}
            </FieldSet>

            <Separator />

            <FieldSet>
              <FieldLegend>Dependent Details</FieldLegend>
              {employee.dependentDetails && employee.dependentDetails.length > 0 ? (
                <div className="space-y-4">
                  {employee.dependentDetails.map((row) => (
                    <div key={row.id} className="rounded-lg border bg-card p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FieldInput label="Name" value={row.name} />
                        <FieldInput label="Relationship" value={row.relationship} />
                        <FieldInput label="Date of Birth" value={row.dob} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No dependent details recorded.</p>
              )}
            </FieldSet>
          </div>

        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {editing ? (
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="outline" onClick={cancelEditing} disabled={saving}>
              <XIcon className="size-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="w-32">
              {saving ? <Loader2Icon className="size-3.5 mr-1.5 animate-spin" /> : <CheckIcon className="size-3.5 mr-1.5" />}
              Save Changes
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={startEditing} className="ml-auto">
            <PencilIcon className="size-3.5 mr-1.5" />
            Edit Employee
          </Button>
        )}
      </div>
    </div>
  );
}
