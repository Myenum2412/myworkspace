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
import { Building2, Users } from "lucide-react";

export const metadata = {
  title: "Departments",
};

const departments = [
  { name: "Engineering", head: "Alice Chen", headAvatar: "", memberCount: 24, openPositions: 3, budget: "$1.2M", color: "bg-blue-500" },
  { name: "Design", head: "Bob Martinez", headAvatar: "", memberCount: 12, openPositions: 2, budget: "$650K", color: "bg-purple-500" },
  { name: "Marketing", head: "Carol Williams", headAvatar: "", memberCount: 18, openPositions: 1, budget: "$890K", color: "bg-emerald-500" },
  { name: "Sales", head: "David Kim", headAvatar: "", memberCount: 22, openPositions: 4, budget: "$1.5M", color: "bg-orange-500" },
  { name: "Human Resources", head: "Eve Johnson", headAvatar: "", memberCount: 8, openPositions: 1, budget: "$420K", color: "bg-pink-500" },
  { name: "Finance", head: "Frank Lee", headAvatar: "", memberCount: 6, openPositions: 0, budget: "$380K", color: "bg-cyan-500" },
  { name: "Operations", head: "Grace Patel", headAvatar: "", memberCount: 10, openPositions: 2, budget: "$560K", color: "bg-amber-500" },
  { name: "Customer Success", head: "Henry Garcia", headAvatar: "", memberCount: 15, openPositions: 3, budget: "$720K", color: "bg-indigo-500" },
];

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

export default async function DepartmentsPage() {
  const session = await auth();
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "user@example.com",
    avatar: session?.user?.image || "",
  };

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
