import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const metadata = {
  title: "Staff Directory",
};
export const dynamic = "force-dynamic";

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  active: "bg-red-100 text-red-700 border-red-300",
  on_leave: "bg-gray-100 text-gray-700 border-gray-300",
};

export default async function StaffListPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let staff: Array<{ name: string; email: string; role: string; department: string; status: string; avatar: string }> = [];

  try {
    if (orgId) {
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      if (userIds.length > 0) {
        const users = await db.collection(collections.users)
          .find({ id: { $in: userIds } })
          .project({ id: 1, name: 1, email: 1, image: 1, status: 1 })
          .toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
        staff = members.map((m: Record<string, unknown>) => {
          const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
          return {
            name: (user?.name as string) || "Unknown",
            email: (user?.email as string) || "",
            role: (m.role as string) || "staffs",
            department: (user?.role as string) || "",
            status: (user?.status as string) || "active",
            avatar: (user?.image as string) || "",
          };
        });
      }
    }
  } catch {
    // staff stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Staff Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">{staff.length} staff members</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
            <div className="overflow-x-auto">
              <table className="table-premium w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Name</th>
                    <th className="px-4 py-3.5 font-semibold">Department</th>
                    <th className="px-4 py-3.5 font-semibold">Role</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.email} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarImage src={s.avatar} alt={s.name} />
                          <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{s.department}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.role}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusStyles[s.status] || ""}>
                        {s.status === "on_leave" ? "On Leave" : "Active"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
