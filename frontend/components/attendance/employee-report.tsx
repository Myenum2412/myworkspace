"use client"
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  SearchIcon,
  XIcon,
  Loader2Icon,
  FileIcon,
  DownloadIcon,
  ExternalLinkIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  UsersIcon,
  PhoneIcon,
  MailIcon,
  MapPinIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

type Employee = Record<string, any>;

type EmployeeReportProps = {
  employees: Employee[];
};

const getInitials = (name: string) =>
  name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700 ring-green-600/20",
  online: "bg-green-50 text-green-700 ring-green-600/20",
  inactive: "bg-gray-100 text-gray-700 ring-gray-500/10",
  offline: "bg-gray-100 text-gray-700 ring-gray-500/10",
  on_leave: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  terminated: "bg-red-50 text-red-700 ring-red-600/20",
};

export function EmployeeReport({ employees }: EmployeeReportProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeDetails, setEmployeeDetails] = useState<Employee | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const rowsPerPage = 15;

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter((e) =>
      (e.name as string)?.toLowerCase().includes(q) ||
      (e.email as string)?.toLowerCase().includes(q) ||
      (e.displayId as string)?.toLowerCase().includes(q) ||
      (e.department as string)?.toLowerCase().includes(q) ||
      (e.designation as string)?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const paginated = useMemo(() => {
    const start = page * rowsPerPage;
    return filtered.slice(start, start + rowsPerPage);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);

  const handleViewEmployee = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEmployeeDetails(data.data || data);
      } else {
        setEmployeeDetails(emp);
      }
    } catch {
      setEmployeeDetails(emp);
    } finally {
      setDetailsLoading(false);
    }
  };

  const statusBadge = (emp: Employee) => {
    const status = (emp.status as string) || "active";
    const color = statusColors[status] || "bg-gray-100 text-gray-700";
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${color}`}>
        {status}
      </span>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Employees ({filtered.length})</CardTitle>
            <div className="relative w-full max-w-xs">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9 h-9"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setPage(0); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <XIcon className="size-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="table-premium w-full text-sm text-left">
              <thead>
                <tr>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Employee</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">ID</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Email</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Department</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Designation</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Role</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Joining Date</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-muted-foreground">
                      {searchQuery ? "No employees match your search" : "No employees found"}
                    </td>
                  </tr>
                ) : (
                  paginated.map((emp) => (
                    <tr
                      key={emp.id as string}
                      className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer"
                      onClick={() => handleViewEmployee(emp)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            {emp.avatar ? <AvatarImage src={emp.avatar as string} /> : null}
                            <AvatarFallback>{getInitials(emp.name as string)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{emp.name as string}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{(emp.displayId as string) || "\u2014"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{emp.email as string}</span>
                      </td>
                      <td className="px-4 py-3">
                        {(emp.department as string) ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                            {emp.department as string}
                          </span>
                        ) : <span className="text-gray-300">\u2014</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-800">{(emp.designation as string) || "\u2014"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-md border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-medium capitalize">
                          {emp.role as string}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-xs">
                          {emp.joiningDate
                            ? new Date(emp.joiningDate as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "\u2014"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{statusBadge(emp)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-600">
                {page * rowsPerPage + 1}\u2013{Math.min((page + 1) * rowsPerPage, filtered.length)} of {filtered.length}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}>
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <Button variant="outline" size="icon" className="size-8" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedEmployee} onOpenChange={(open) => { if (!open) { setSelectedEmployee(null); setEmployeeDetails(null); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : employeeDetails ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="size-14">
                    {employeeDetails.avatar ? <AvatarImage src={employeeDetails.avatar as string} /> : null}
                    <AvatarFallback className="text-base">{getInitials(employeeDetails.name as string)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-xl">{employeeDetails.name as string}</DialogTitle>
                  <DialogDescription>
                    {employeeDetails.displayId ? <span className="font-mono mr-3">#{String(employeeDetails.displayId)}</span> : null}
                    {String(employeeDetails.email || "")}
                  </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <FieldDisplay label="First Name" value={employeeDetails.firstName as string} />
                    <FieldDisplay label="Last Name" value={employeeDetails.lastName as string} />
                    <FieldDisplay label="Nickname" value={employeeDetails.nickname as string} />
                  </div>
                </div>
                <Separator />

                {/* Work Information */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <BriefcaseIcon className="size-3.5" /> Work Information
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <FieldDisplay label="Department" value={employeeDetails.department as string} />
                    <FieldDisplay label="Designation" value={employeeDetails.designation as string} />
                    <FieldDisplay label="Role" value={employeeDetails.role as string} />
                    <FieldDisplay label="Employment Type" value={employeeDetails.employmentType as string} />
                    <FieldDisplay label="Branch" value={employeeDetails.branchName as string} />
                    <FieldDisplay label="Shift" value={employeeDetails.shift as string} />
                    <FieldDisplay label="Location" value={employeeDetails.location as string} />
                    <FieldDisplay label="Source of Hire" value={employeeDetails.sourceOfHire as string} />
                    <FieldDisplay label="Current Experience" value={employeeDetails.currentExperience as string} />
                    <FieldDisplay label="Total Experience" value={employeeDetails.totalExperience as string} />
                    <FieldDisplay label="Joining Date" value={employeeDetails.joiningDate as string} type="date" />
                    <FieldDisplay label="Status" value={employeeDetails.status as string} type="badge" />
                  </div>
                </div>
                <Separator />

                {/* Contact Details */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <PhoneIcon className="size-3.5" /> Contact Details
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <FieldDisplay label="Phone" value={employeeDetails.phone as string} />
                    <FieldDisplay label="Alternate Email" value={employeeDetails.alternateEmail as string} />
                    <FieldDisplay label="Address" value={employeeDetails.address as string} />
                    <FieldDisplay label="City" value={employeeDetails.city as string} />
                    <FieldDisplay label="State" value={employeeDetails.state as string} />
                    <FieldDisplay label="Country" value={employeeDetails.country as string} />
                    <FieldDisplay label="Postal Code" value={employeeDetails.zipCode as string} />
                  </div>
                </div>
                <Separator />

                {/* Social Links */}
                {(employeeDetails.linkedin || employeeDetails.github || employeeDetails.twitter || employeeDetails.website) && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Social & Web</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <FieldDisplay label="LinkedIn" value={employeeDetails.linkedin as string} type="link" />
                        <FieldDisplay label="GitHub" value={employeeDetails.github as string} type="link" />
                        <FieldDisplay label="Twitter" value={employeeDetails.twitter as string} type="link" />
                        <FieldDisplay label="Website" value={employeeDetails.website as string} type="link" />
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Work Experience */}
                {employeeDetails.workExperience && (employeeDetails.workExperience as any[]).length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BriefcaseIcon className="size-3.5" /> Work Experience
                      </h3>
                      <div className="space-y-3">
                        {(employeeDetails.workExperience as any[]).map((exp: any, i: number) => (
                          <div key={exp.id || i} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-medium text-sm">{exp.company}{exp.title ? ` \u2013 ${exp.title}` : ""}</p>
                                {exp.from && <p className="text-xs text-muted-foreground mt-0.5">{exp.from}{exp.to ? ` to ${exp.to}` : ""}</p>}
                              </div>
                              {exp.relevant && <Badge variant="outline" className="text-xs">Relevant</Badge>}
                            </div>
                            {exp.description && <p className="text-xs text-gray-600 mt-2">{exp.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Education Details */}
                {employeeDetails.educationDetails && (employeeDetails.educationDetails as any[]).length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <GraduationCapIcon className="size-3.5" /> Education Details
                      </h3>
                      <div className="space-y-3">
                        {(employeeDetails.educationDetails as any[]).map((edu: any, i: number) => (
                          <div key={edu.id || i} className="border rounded-lg p-3 bg-gray-50">
                            <p className="font-medium text-sm">{edu.institute}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {[edu.degree, edu.specialization].filter(Boolean).join(" \u2013 ")}
                              {edu.completionDate ? ` | ${edu.completionDate}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Dependent Details */}
                {employeeDetails.dependentDetails && (employeeDetails.dependentDetails as any[]).length > 0 && (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                        <UsersIcon className="size-3.5" /> Dependent Details
                      </h3>
                      <div className="space-y-3">
                        {(employeeDetails.dependentDetails as any[]).map((dep: any, i: number) => (
                          <div key={dep.id || i} className="border rounded-lg p-3 bg-gray-50">
                            <p className="font-medium text-sm">{dep.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {dep.relationship}{dep.dob ? ` | ${new Date(dep.dob).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Files */}
                {employeeDetails.files && (employeeDetails.files as any[]).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileIcon className="size-3.5" /> Documents
                    </h3>
                    <div className="space-y-2">
                      {(employeeDetails.files as any[]).map((file: any, i: number) => (
                        <div key={file.id || i} className="flex items-center justify-between border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{file.name || file.fileName}</p>
                              {file.size && <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {file.url && (
                              <Button variant="ghost" size="icon" className="size-8" asChild>
                                <a href={file.url} download>
                                  <DownloadIcon className="size-4" />
                                </a>
                              </Button>
                            )}
                            {file.url && (
                              <Button variant="ghost" size="icon" className="size-8" asChild>
                                <a href={file.url} target="_blank" rel="noreferrer">
                                  <ExternalLinkIcon className="size-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FieldDisplay({ label, value, type }: { label: string; value?: string | null; type?: "date" | "badge" | "link" }) {
  if (!value || value === "\u2014") return null;

  if (type === "badge") {
    const color = statusColors[value] || "bg-gray-100 text-gray-700";
    return (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mt-0.5 ring-1 ring-inset ${color}`}>
          {value}
        </span>
      </div>
    );
  }

  if (type === "date") {
    return (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">
          {new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      </div>
    );
  }

  if (type === "link") {
    const href = String(value).startsWith("http") ? String(value) : `https://${String(value)}`;
    return (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline mt-0.5 block truncate">
          {String(value)}
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}
