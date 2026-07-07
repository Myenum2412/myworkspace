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
  const fullName = employee.firstName && employee.lastName
    ? `${employee.firstName} ${employee.lastName}`
    : employee.name;

  const FieldInput = ({ label, value, className }: { label: string; value?: string | null; className?: string }) => (
    <Field className={className}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={value || ""}
        readOnly
        className="bg-muted/30"
      />
    </Field>
  );

  return (
    <div className="flex flex-col h-full">
      <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
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

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 min-h-0">
        <div className="space-y-12 max-w-4xl mx-auto">

          {/* Step 1: Profile */}
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 items-center sm:items-start">
              <div className="flex-shrink-0">
                <Avatar className="h-24 w-24 ring-2 ring-border">
                  <AvatarImage src={employee.avatar} alt={fullName} />
                  <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 w-full">
                <FieldSet>
                  <FieldLegend>Basic Information</FieldLegend>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldInput label="Display ID" value={employee.displayId || employee.id} />
                    <FieldInput label="First Name" value={employee.firstName || fullName.split(" ")[0]} />
                    <FieldInput label="Last Name" value={employee.lastName || fullName.split(" ").slice(1).join(" ") || null} />
                    <FieldInput label="Nickname" value={employee.nickname} />
                    <FieldInput label="Email" value={employee.email} />
                    <FieldInput label="Department" value={employee.department} />
                    <FieldInput label="Location" value={employee.location || employee.branchName} />
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
                <FieldInput label="Department" value={employee.department} />
                <FieldInput label="Location" value={employee.location || employee.branchName} />
                <FieldInput label="Designation" value={employee.designation} />
                <FieldInput label="Role" value={employee.role} />
                <FieldInput label="Employment Type" value={employee.employmentType} />
                <FieldInput label="Status" value={employee.status} />
              </div>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Joining Details</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldInput label="Branch Name" value={employee.branchName} />
                <FieldInput label="Shift" value={employee.shift} />
                <FieldInput label="Date of Joining" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : null} />
                <FieldInput label="Source of Hire" value={employee.sourceOfHire} />
                <FieldInput label="Current Experience" value={employee.currentExperience} />
                <FieldInput label="Total Experience" value={employee.totalExperience} />
              </div>
            </FieldSet>
            <Separator />
          </div>

          {/* Step 3: Contact */}
          <div className="space-y-8">
            <FieldSet>
              <FieldLegend>Contact Details</FieldLegend>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldInput label="Phone Number" value={employee.phone} />
                <FieldInput label="Alternate Email" value={employee.alternateEmail} />
                <FieldInput label="Address" value={employee.address} className="sm:col-span-2" />

                <FieldInput label="City" value={employee.city} />
                <FieldInput label="State / Province" value={employee.state} />
                <FieldInput label="Postal Code" value={employee.zipCode} />
                <FieldInput label="Country" value={employee.country} />
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

      {/* Removed duplicated inline edit footer */}
    </div>
  );
}
