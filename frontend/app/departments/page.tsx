import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { Building2, Users } from "lucide-react";

export const metadata = {
  title: "Departments",
};

const deptColors = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500",
  "bg-pink-500", "bg-cyan-500", "bg-amber-500", "bg-indigo-500",
];

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

export default async function DepartmentsPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let departments: Array<{ name: string; head: string; headAvatar: string; memberCount: number; openPositions: number; budget: string; color: string }> = [];

  try {
    if (orgId) {
      const teamsData = await db.collection(collections.teams).find({ orgId }).toArray();
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      const usersData = userIds.length > 0
        ? await db.collection(collections.users).find({ id: { $in: userIds } }).project({ id: 1, name: 1, image: 1 }).toArray()
        : [];
      const userMap = new Map(usersData.map((u: Record<string, unknown>) => [u.id, u]));

      const adminMember = members.find((m: Record<string, unknown>) => m.role === "admin" || m.role === "manager");
      const headUser = adminMember ? userMap.get(adminMember.userId as string) as Record<string, unknown> | undefined : undefined;

      departments = teamsData.map((t: Record<string, unknown>, i: number) => ({
        name: (t.name as string) || "Unknown",
        head: (headUser?.name as string) || "Unassigned",
        headAvatar: (headUser?.image as string) || "",
        memberCount: members.length,
        openPositions: 0,
        budget: "$0",
        color: deptColors[i % deptColors.length],
      }));
    }
  } catch {
    // departments stays empty on error
  }

  const totalMembers = departments.reduce((s, d) => s + d.memberCount, 0);
  const totalOpen = departments.reduce((s, d) => s + d.openPositions, 0);

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Departments</h1>
              <p className="text-sm text-muted-foreground mt-1">{departments.length} departments · {totalMembers} members</p>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {totalOpen} open positions
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {departments.map((dept) => (
              <Card key={dept.name}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${dept.color} text-white`}>
                      <Building2 className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{dept.budget} budget</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Users className="size-4" />
                      {dept.memberCount} members
                    </div>
                    {dept.openPositions > 0 && (
                      <Badge variant="outline">{dept.openPositions} open</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm border-t pt-3">
                    <Avatar className="size-6">
                      <AvatarImage src={dept.headAvatar} alt={dept.head} />
                      <AvatarFallback className="text-[10px]">{getInitials(dept.head)}</AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground">Head: <span className="font-medium text-foreground">{dept.head}</span></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
