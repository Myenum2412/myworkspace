"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PencilIcon, UserIcon, BriefcaseIcon, PhoneIcon, Share2Icon, HistoryIcon, FileIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react";
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

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3">
        <Icon className="size-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5">{value || "\u2014"}</p>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      {children}
    </div>
  );
}

export function EmployeeDetailedView({ employee, onEdit }: { employee: Employee; onEdit?: (emp: Employee) => void }) {
  const fullName = employee.firstName && employee.lastName
    ? `${employee.firstName} ${employee.lastName}`
    : employee.name;

  return (
    <>
      <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
        <DialogTitle className="flex items-center gap-2 text-xl">
          <UserIcon className="size-5" />
          {fullName}
        </DialogTitle>
        <DialogDescription>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="capitalize text-xs">{employee.role}</Badge>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[employee.status] || ""}`}>
              {employee.status.replace("_", " ")}
            </span>
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-5">
        {/* Profile */}
        <Section icon={UserIcon} title="Profile">
          <div className="flex gap-6 items-start">
            <Avatar className="size-20 ring-2 ring-border shrink-0">
              <AvatarImage src={employee.avatar} alt={fullName} />
              <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <InfoCard label="Employee ID" value={employee.displayId || employee.id} />
              <InfoCard label="Nickname" value={employee.nickname} />
              <InfoCard label="First Name" value={employee.firstName || fullName.split(" ")[0]} />
              <InfoCard label="Last Name" value={employee.lastName || fullName.split(" ").slice(1).join(" ") || null} />
              <InfoCard label="Email" value={employee.email} />
              <InfoCard label="Department" value={employee.department} />
              <InfoCard label="Location" value={employee.location || employee.branchName} />
            </div>
          </div>
        </Section>

        <Separator />

        {/* Work Info */}
        <Section icon={BriefcaseIcon} title="Work Info">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Designation" value={employee.designation} />
            <InfoCard label="Role" value={employee.role} />
            <InfoCard label="Employment Type" value={employee.employmentType} />
            <InfoCard label="Status" value={employee.status} />
            <InfoCard label="Branch" value={employee.branchName} />
            <InfoCard label="Shift" value={employee.shift} />
            <InfoCard label="Source of Hire" value={employee.sourceOfHire} />
            <InfoCard label="Joining Date" value={employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : null} />
            <InfoCard label="Current Experience" value={employee.currentExperience} />
            <InfoCard label="Total Experience" value={employee.totalExperience} />
          </div>
        </Section>

        <Separator />

        {/* Contact */}
        <Section icon={PhoneIcon} title="Contact">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="Phone" value={employee.phone} />
            <InfoCard label="Alternate Email" value={employee.alternateEmail} />
            <InfoCard label="Address" value={employee.address} />
            <InfoCard label="City" value={employee.city} />
            <InfoCard label="State" value={employee.state} />
            <InfoCard label="Country" value={employee.country} />
            <InfoCard label="Zip Code" value={employee.zipCode} />
          </div>
        </Section>

        <Separator />

        {/* Social */}
        <Section icon={Share2Icon} title="Social">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard label="LinkedIn" value={employee.linkedin} />
            <InfoCard label="GitHub" value={employee.github} />
            <InfoCard label="Twitter / X" value={employee.twitter} />
            <InfoCard label="Website" value={employee.website} />
          </div>
        </Section>

        <Separator />

        {/* Documents */}
        <Section icon={FileIcon} title="Documents">
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
        </Section>

        <Separator />

        {/* History */}
        <Section icon={HistoryIcon} title="History">
          <div className="space-y-4">
            <SubSection title="Work Experience">
              {employee.workExperience && employee.workExperience.length > 0 ? (
                <div className="space-y-2">
                  {employee.workExperience.map((row) => (
                    <div key={row.id} className="rounded-lg border bg-card px-4 py-3 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard label="Company" value={row.company} />
                        <InfoCard label="Job Title" value={row.title} />
                        <InfoCard label="From" value={row.from} />
                        <InfoCard label="To" value={row.to} />
                      </div>
                      {row.description && <p className="text-sm text-muted-foreground">{row.description}</p>}
                      {row.relevant && <Badge variant="secondary" className="text-[10px]">Relevant</Badge>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No work experience recorded.</p>
              )}
            </SubSection>

            <SubSection title="Education">
              {employee.educationDetails && employee.educationDetails.length > 0 ? (
                <div className="space-y-2">
                  {employee.educationDetails.map((row) => (
                    <div key={row.id} className="rounded-lg border bg-card px-4 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard label="Institute" value={row.institute} />
                        <InfoCard label="Degree/Diploma" value={row.degree} />
                        <InfoCard label="Specialization" value={row.specialization} />
                        <InfoCard label="Completion Date" value={row.completionDate} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No education details recorded.</p>
              )}
            </SubSection>

            <SubSection title="Dependents">
              {employee.dependentDetails && employee.dependentDetails.length > 0 ? (
                <div className="space-y-2">
                  {employee.dependentDetails.map((row) => (
                    <div key={row.id} className="rounded-lg border bg-card px-4 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoCard label="Name" value={row.name} />
                        <InfoCard label="Relationship" value={row.relationship} />
                        <InfoCard label="Date of Birth" value={row.dob} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No dependent details recorded.</p>
              )}
            </SubSection>
          </div>
        </Section>
      </div>

      <DialogFooter className="shrink-0 border-t px-6 py-4 gap-2">
        {onEdit && (
          <Button variant="outline" onClick={() => onEdit(employee)}>
            <PencilIcon className="size-3.5 mr-1.5" />
            Edit Employee
          </Button>
        )}
      </DialogFooter>
    </>
  );
}
