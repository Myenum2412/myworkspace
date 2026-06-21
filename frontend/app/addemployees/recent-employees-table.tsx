"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EyeIcon, PencilIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { EmployeeDetailedView } from "@/app/employees/employee-detailed-view";
import { EmployeeEditForm } from "@/app/employees/employee-edit-form";
import { type Employee } from "@/app/employees/columns";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const RECENT_EMPLOYEES: Employee[] = [
  { id: "recent_1", name: "Sarah Mitchell", email: "s.mitchell@company.com", role: "member", status: "active", department: "Engineering", designation: "Frontend Developer", employmentType: "Full-time", phone: "+1-555-0201", branchName: "San Francisco", joiningDate: "2026-06-18T00:00:00Z", avatar: "", displayId: "EMP008", firstName: "Sarah", lastName: "Mitchell", nickname: "Sara", location: "San Francisco", shift: "Morning", sourceOfHire: "LinkedIn", currentExperience: "2 years", totalExperience: "4 years", alternateEmail: "sarah.m@personal.com", address: "55 Market St", city: "San Francisco", state: "CA", country: "USA", zipCode: "94105", linkedin: "https://linkedin.com/in/sarahmitchell", github: "https://github.com/sarahmitchell", twitter: "@sarah_dev", workExperience: [{ id: "we1", company: "WebStudio", title: "Junior Frontend Developer", from: "2022-01", to: "2026-05", description: "Built React components and landing pages", relevant: true }], educationDetails: [{ id: "ed1", institute: "UCLA", degree: "B.S. Computer Science", specialization: "Web Engineering", completionDate: "2021-06" }], dependentDetails: [] },
  { id: "recent_2", name: "James Rodriguez", email: "j.rodriguez@company.com", role: "member", status: "active", department: "Marketing", designation: "Data Analyst", employmentType: "Full-time", phone: "+1-555-0202", branchName: "Chicago", joiningDate: "2026-06-17T00:00:00Z", avatar: "", displayId: "EMP009", firstName: "James", lastName: "Rodriguez", nickname: "Jim", location: "Chicago", shift: "Morning", sourceOfHire: "Referral", currentExperience: "3 years", totalExperience: "5 years", alternateEmail: "j.rodriguez@email.com", address: "200 Lake Shore Dr", city: "Chicago", state: "IL", country: "USA", zipCode: "60611", linkedin: "https://linkedin.com/in/jamesrodriguez", workExperience: [{ id: "we1", company: "DataMetrics", title: "Junior Data Analyst", from: "2023-03", to: "2026-05", description: "Analyzed marketing data and created dashboards", relevant: true }], educationDetails: [{ id: "ed1", institute: "UIUC", degree: "B.S. Statistics", specialization: "Data Science", completionDate: "2022-12" }], dependentDetails: [] },
  { id: "recent_3", name: "Emily Chang", email: "e.chang@company.com", role: "member", status: "active", department: "Design", designation: "UX Researcher", employmentType: "Full-time", phone: "+1-555-0203", branchName: "New York", joiningDate: "2026-06-15T00:00:00Z", avatar: "", displayId: "EMP010", firstName: "Emily", lastName: "Chang", nickname: "Em", location: "New York", shift: "Afternoon", sourceOfHire: "Company Website", currentExperience: "1 year", totalExperience: "3 years", alternateEmail: "e.chang@personal.com", address: "88 Fifth Ave", city: "New York", state: "NY", country: "USA", zipCode: "10011", linkedin: "https://linkedin.com/in/emilychang", twitter: "@emily_ux", workExperience: [{ id: "we1", company: "UXLab", title: "UX Research Assistant", from: "2023-06", to: "2026-04", description: "Conducted user interviews and usability testing", relevant: true }], educationDetails: [{ id: "ed1", institute: "Parsons", degree: "MFA Design", specialization: "UX Research", completionDate: "2023-05" }], dependentDetails: [] },
  { id: "recent_4", name: "Omar Hassan", email: "o.hassan@company.com", role: "member", status: "active", department: "Engineering", designation: "Backend Engineer", employmentType: "Full-time", phone: "+1-555-0204", branchName: "Austin", joiningDate: "2026-06-12T00:00:00Z", avatar: "", displayId: "EMP011", firstName: "Omar", lastName: "Hassan", nickname: "O", location: "Austin", shift: "Morning", sourceOfHire: "LinkedIn", currentExperience: "4 years", totalExperience: "7 years", alternateEmail: "o.hassan@email.com", address: "300 Congress Ave", city: "Austin", state: "TX", country: "USA", zipCode: "73301", linkedin: "https://linkedin.com/in/omarhassan", github: "https://github.com/omarhassan", workExperience: [{ id: "we1", company: "CloudStack", title: "Backend Developer", from: "2020-08", to: "2026-05", description: "Built microservices and REST APIs with Go and Python", relevant: true }], educationDetails: [{ id: "ed1", institute: "UT Austin", degree: "B.S. Computer Engineering", specialization: "Distributed Systems", completionDate: "2020-05" }], dependentDetails: [{ id: "dep1", name: "Nora Hassan", relationship: "Child", dob: "2023-03-20" }] },
  { id: "recent_5", name: "Lisa Thompson", email: "l.thompson@company.com", role: "member", status: "active", department: "Customer Success", designation: "Customer Success Manager", employmentType: "Full-time", phone: "+1-555-0205", branchName: "Remote", joiningDate: "2026-06-10T00:00:00Z", avatar: "", displayId: "EMP012", firstName: "Lisa", lastName: "Thompson", nickname: "Lis", location: "Remote", shift: "Flexible", sourceOfHire: "Referral", currentExperience: "2 years", totalExperience: "6 years", alternateEmail: "l.thompson@outlook.com", address: "15 Virtual Way", city: "Denver", state: "CO", country: "USA", zipCode: "80201", linkedin: "https://linkedin.com/in/lisathompson", twitter: "@lisa_cs", workExperience: [{ id: "we1", company: "SupportFirst", title: "Customer Success Associate", from: "2021-04", to: "2026-05", description: "Managed enterprise client relationships and onboarding", relevant: true }], educationDetails: [{ id: "ed1", institute: "Colorado State", degree: "B.A. Business Administration", specialization: "Management", completionDate: "2020-12" }], dependentDetails: [] },
  { id: "recent_6", name: "Daniel Park", email: "d.park@company.com", role: "member", status: "active", department: "Sales", designation: "Sales Associate", employmentType: "Full-time", phone: "+1-555-0206", branchName: "New York", joiningDate: "2026-06-08T00:00:00Z", avatar: "", displayId: "EMP013", firstName: "Daniel", lastName: "Park", nickname: "Dan", location: "New York", shift: "Morning", sourceOfHire: "LinkedIn", currentExperience: "1 year", totalExperience: "2 years", alternateEmail: "d.park@email.com", address: "500 Madison Ave", city: "New York", state: "NY", country: "USA", zipCode: "10022", linkedin: "https://linkedin.com/in/danielpark", workExperience: [{ id: "we1", company: "SalesGenius", title: "Sales Intern", from: "2024-06", to: "2026-05", description: "Assisted with lead generation and CRM management", relevant: true }], educationDetails: [{ id: "ed1", institute: "NYU", degree: "B.S. Marketing", specialization: "Sales Management", completionDate: "2024-05" }], dependentDetails: [] },
];

export function RecentEmployeesTable() {
  const [viewEmp, setViewEmp] = useState<Employee | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEditFromView = (emp: Employee) => {
    setViewOpen(false);
    setViewEmp(null);
    setEditEmp(emp);
    setEditOpen(true);
  };

  return (
    <>
      {editEmp ? (
        <Card className="flex flex-col bg-background">
          <EmployeeEditForm
            employee={editEmp}
            onSave={(updated) => {
              setEditOpen(false);
              setEditEmp(null);
            }}
            onCancel={() => { setEditOpen(false); setEditEmp(null); }}
          />
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>Recently Added</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Department</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Added</th>
                  <th className="pb-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody>
                {RECENT_EMPLOYEES.map((emp) => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={emp.avatar} alt={emp.name} />
                          <AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm">{emp.department}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{emp.designation}</td>
                    <td className="py-3">
                      <Badge variant="secondary">{new Date(emp.joiningDate).toLocaleDateString()}</Badge>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setViewEmp(emp); setViewOpen(true); }}
                      >
                        <EyeIcon className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}

      <Dialog open={viewOpen} onOpenChange={(o) => { if (!o) { setViewOpen(false); setViewEmp(null); } }}>
        <DialogContent className="p-0 flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full">
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>View all employee information</DialogDescription>
          </DialogHeader>
          <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden">
            {viewEmp && <EmployeeDetailedView employee={viewEmp} onEdit={handleEditFromView} />}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
