import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const metadata = {
  title: "Attendance",
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

const statusStyles: Record<string, string> = {
  present: "bg-red-100 text-red-700 border-red-300",
  absent: "bg-gray-100 text-gray-700 border-gray-300",
  late: "bg-orange-100 text-orange-700 border-orange-300",
};

export default async function StaffAttendancePage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let today: Array<{ name: string; checkIn: string | null; checkOut: string | null; status: string }> = [];

  try {
    if (orgId) {
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      if (userIds.length > 0) {
        const users = await db.collection(collections.users)
          .find({ id: { $in: userIds } })
          .project({ id: 1, name: 1, image: 1, status: 1, createdAt: 1 })
          .toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
        today = members.map((m: Record<string, unknown>) => {
          const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
          const createdAt = user?.createdAt;
          const checkInTime = createdAt ? new Date(createdAt as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;
          return {
            name: (user?.name as string) || "Unknown",
            checkIn: checkInTime,
            checkOut: null,
            status: (user?.status as string) === "break" ? "late" : (user?.status as string) === "offline" ? "absent" : "present",
          };
        });
      }
    }
  } catch {
    // today stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">Today's attendance record</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr className="border-b bg-blue-50 text-left text-sm text-blue-800 font-medium">
                  <th className="pb-3 font-medium">Staff</th>
                  <th className="pb-3 font-medium">Check In</th>
                  <th className="pb-3 font-medium">Check Out</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {today.map((t, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors bg-white">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8">
                          <AvatarFallback>{getInitials(t.name)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{t.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-sm">{t.checkIn || "—"}</td>
                    <td className="py-3 pr-4 text-sm">{t.checkOut || "—"}</td>
                    <td className="py-3">
                      <Badge className={statusStyles[t.status] || ""}>{t.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
