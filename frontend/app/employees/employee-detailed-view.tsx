"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "./columns";

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  online: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  offline: "bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
  break: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  on_leave: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

const steps = ["Profile", "Work Info", "Contact", "Social", "History"];

function FieldRow({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-sm font-medium mt-0.5">{value || "—"}</p>
    </div>
  );
}

export function EmployeeDetailedView({ employee, onEdit }: { employee: Employee; onEdit?: (emp: Employee) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const fullName = employee.firstName && employee.lastName
    ? `${employee.firstName} ${employee.lastName}`
    : employee.name;

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Edit Button */}
      {onEdit && (
        <div className="flex justify-end -mb-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(employee)}>
            <PencilIcon className="size-4 mr-1" />
            Edit
          </Button>
        </div>
      )}
      {/* Progress Indicator */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-4">
          {steps.map((label, i) => {
            const step = i + 1;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setCurrentStep(step)}
                className="flex flex-col items-center gap-2 flex-1 relative cursor-pointer"
              >
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 z-10",
                    currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {step}
                </div>
                <span className={cn(
                  "text-[9px] font-bold uppercase tracking-wider transition-colors duration-300",
                  currentStep >= step ? "text-foreground" : "text-muted-foreground"
                )}>
                  {label}
                </span>
                {step < steps.length && (
                  <div className="absolute top-4 left-[60%] right-[-40%] h-[2px] bg-muted -z-0">
                    <div className="h-full bg-primary transition-all duration-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-1">
          <div className="space-y-8 py-2">
            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="flex gap-12 items-start mb-6">
                  <div className="flex-shrink-0 flex flex-col items-center gap-3">
                    <Avatar className="size-28 ring-2 ring-border">
                      <AvatarImage src={employee.avatar} alt={fullName} />
                      <AvatarFallback className="text-2xl">{getInitials(fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{employee.role}</Badge>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[employee.status] || statusColors.active}`}>
                        {employee.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <FieldRow label="Employee ID" value={employee.displayId || employee.id} />
                    <FieldRow label="Nickname" value={employee.nickname} />
                    <FieldRow label="First Name" value={employee.firstName || fullName.split(" ")[0]} />
                    <FieldRow label="Last Name" value={employee.lastName || fullName.split(" ").slice(1).join(" ") || "—"} />
                    <FieldRow label="Email" value={employee.email} />
                    <FieldRow label="Department" value={employee.department} />
                    <FieldRow label="Location" value={employee.location || employee.branchName} />
                  </div>
                </div>
                <Separator />
              </div>
            )}

            {/* Step 2: Work Info */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Designation" value={employee.designation} />
                  <FieldRow label="Role" value={employee.role} />
                  <FieldRow label="Employment Type" value={employee.employmentType} />
                  <FieldRow label="Status" value={employee.status} />
                  <FieldRow label="Branch" value={employee.branchName} />
                  <FieldRow label="Shift" value={employee.shift} />
                  <FieldRow label="Source of Hire" value={employee.sourceOfHire} />
                  <FieldRow label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : undefined} />
                  <FieldRow label="Current Experience" value={employee.currentExperience} />
                  <FieldRow label="Total Experience" value={employee.totalExperience} />
                </div>
                <Separator />
              </div>
            )}

            {/* Step 3: Contact */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="Phone" value={employee.phone} />
                  <FieldRow label="Alternate Email" value={employee.alternateEmail} />
                  <FieldRow label="Address" value={employee.address} className="sm:col-span-2" />
                  <FieldRow label="City" value={employee.city} />
                  <FieldRow label="State" value={employee.state} />
                  <FieldRow label="Country" value={employee.country} />
                  <FieldRow label="Zip Code" value={employee.zipCode} />
                </div>
                <Separator />
              </div>
            )}

            {/* Step 4: Social */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <FieldRow label="LinkedIn" value={employee.linkedin} />
                  <FieldRow label="GitHub" value={employee.github} />
                  <FieldRow label="Twitter / X" value={employee.twitter} />
                  <FieldRow label="Website" value={employee.website} />
                </div>
              </div>
            )}

            {/* Step 5: History */}
            {currentStep === 5 && (
              <div className="space-y-8 pb-8">
                {/* Work Experience */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Work Experience</h3>
                  {employee.workExperience && employee.workExperience.length > 0 ? (
                    employee.workExperience.map((row, i) => (
                      <div key={row.id} className="border rounded-md p-4 bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <FieldRow label="Company" value={row.company} />
                          <FieldRow label="Job Title" value={row.title} />
                          <FieldRow label="From" value={row.from} />
                          <FieldRow label="To" value={row.to} />
                          <div className="sm:col-span-2">
                            <FieldRow label="Description" value={row.description} />
                          </div>
                        </div>
                        {row.relevant && (
                          <Badge variant="secondary">Relevant</Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No work experience recorded.</p>
                  )}
                </div>

                <Separator />

                {/* Education */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Education Details</h3>
                  {employee.educationDetails && employee.educationDetails.length > 0 ? (
                    employee.educationDetails.map((row) => (
                      <div key={row.id} className="border rounded-md p-4 bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <FieldRow label="Institute" value={row.institute} />
                          <FieldRow label="Degree/Diploma" value={row.degree} />
                          <FieldRow label="Specialization" value={row.specialization} />
                          <FieldRow label="Completion Date" value={row.completionDate} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No education details recorded.</p>
                  )}
                </div>

                <Separator />

                {/* Dependents */}
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Dependent Details</h3>
                  {employee.dependentDetails && employee.dependentDetails.length > 0 ? (
                    employee.dependentDetails.map((row) => (
                      <div key={row.id} className="border rounded-md p-4 bg-muted/20 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <FieldRow label="Name" value={row.name} />
                          <FieldRow label="Relationship" value={row.relationship} />
                          <FieldRow label="Date of Birth" value={row.dob} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No dependent details recorded.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
