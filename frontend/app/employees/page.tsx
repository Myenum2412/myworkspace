import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth/config";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { AddEmployeeDialog } from "@/components/add-employee-dialog";

export const metadata = {
  title: "Employees Overview",
};

const employees = [
  { name: "Alice Johnson", role: "Senior Designer", department: "Creative", status: "Active", email: "alice@myworkspace.io" },
  { name: "Bob Smith", role: "Full-Stack Developer", department: "Engineering", status: "Active", email: "bob@myworkspace.io" },
  { name: "Carol White", role: "Product Manager", department: "Operations", status: "On Leave", email: "carol@myworkspace.io" },
  { name: "David Brown", role: "Backend Developer", department: "Engineering", status: "Active", email: "david@myworkspace.io" },
  { name: "Eve Davis", role: "UI/UX Designer", department: "Creative", status: "Active", email: "eve@myworkspace.io" },
  { name: "Frank Miller", role: "DevOps Engineer", department: "Engineering", status: "Active", email: "frank@myworkspace.io" },
  { name: "Grace Lee", role: "HR Coordinator", department: "Operations", status: "On Leave", email: "grace@myworkspace.io" },
  { name: "Henry Wilson", role: "Data Analyst", department: "Engineering", status: "Active", email: "henry@myworkspace.io" },
];

export default async function EmployeesPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };
  const active = employees.filter((e) => e.status === "Active").length;
  const onLeave = employees.filter((e) => e.status === "On Leave").length;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold">Employees Overview</h1>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total Employees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-500">{active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">On Leave</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-500">{onLeave}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Departments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
              </CardContent>
            </Card>
                        <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Terminated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
              </CardContent>
            </Card>
          </div>

          <ChartAreaInteractive />

          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Role</th>
                      <th className="pb-3 pr-4 font-medium">Department</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.name} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{emp.name}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{emp.role}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{emp.department}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{emp.email}</td>
                        <td className="py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${emp.status === "Active"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                          >
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
      <AddEmployeeDialog />
    </SidebarProvider>
  );
}
