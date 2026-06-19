import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { AddEmployeeDialog } from "@/components/add-employee-dialog";

export const metadata = { title: "Employees Overview" };

type MemberInfo = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
};

export default async function EmployeesPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "",
  };

  let members: MemberInfo[] = [];

  if (session?.user?.id) {
    const orgMember = await db.collection(collections.orgMembers).findOne({ userId: session.user.id });
    if (orgMember) {
      const allOrgMembers = await db.collection(collections.orgMembers).find({ orgId: orgMember.orgId }).toArray();
      const userIds = allOrgMembers.map((m: Record<string, unknown>) => m.userId);
      const users = await db.collection(collections.users).find({ id: { $in: userIds } }).toArray();
      const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
      members = allOrgMembers.map((m: Record<string, unknown>) => ({
        id: m.userId as string,
        name: (userMap.get(m.userId as string) as Record<string, unknown>)?.name as string || "Unknown",
        email: (userMap.get(m.userId as string) as Record<string, unknown>)?.email as string || "",
        role: (m.role as string) || "member",
        status: (userMap.get(m.userId as string) as Record<string, unknown>)?.status as string || "offline",
      }));
    }
  }

  const active = members.filter((e) => e.status === "online" || e.status === "active").length;
  const onLeave = members.filter((e) => e.status === "break" || e.status === "on_leave").length;
  const departments = [...new Set(members.map((m) => m.role))].length;

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold">Employees Overview</h1>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Employees</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{members.length}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-emerald-500">{active}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">On Leave</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-amber-500">{onLeave}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Departments</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{departments || 1}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Terminated</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{members.filter((e) => e.status === "offline").length}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Employee List</CardTitle></CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found in your organization.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 pr-4 font-medium">Name</th>
                        <th className="pb-3 pr-4 font-medium">Email</th>
                        <th className="pb-3 pr-4 font-medium">Role</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{m.name}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{m.email}</td>
                          <td className="py-3 pr-4"><Badge variant="secondary" className="capitalize">{m.role}</Badge></td>
                          <td className="py-3"><Badge variant={m.status === "online" ? "default" : "secondary"}>{m.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
      <AddEmployeeDialog />
    </SidebarProvider>
  );
}
