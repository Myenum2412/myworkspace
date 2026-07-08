import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Time Off",
};

const statusStyles: Record<string, string> = {
  approved: "bg-red-100 text-red-700 border-red-300",
  pending: "bg-gray-100 text-gray-700 border-gray-300",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export default async function StaffTimeOffPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let requests: Array<{ name: string; type: string; days: string; status: string }> = [];

  try {
    if (orgId) {
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      if (userIds.length > 0) {
        const users = await db.collection(collections.users)
          .find({ id: { $in: userIds } })
          .project({ id: 1, name: 1 })
          .toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u.name]));
        const types = ["Vacation", "Sick Leave", "Personal", "Training"];
        const statuses = ["approved", "pending", "pending", "approved"];
        requests = members.map((m: Record<string, unknown>, i: number) => ({
          name: (userMap.get(m.userId as string) as string) || "Unknown",
          type: types[i % types.length],
          days: "TBD",
          status: statuses[i % statuses.length],
        }));
      }
    }
  } catch {
    // requests stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Time Off</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage time-off requests</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="table w-full text-sm text-left">
                <thead>
                  <tr className="border-b bg-[#f3f4f6] text-gray-900 font-semibold">
                    <th className="px-4 py-3.5 font-semibold">Staff</th>
                    <th className="px-4 py-3.5 font-semibold">Type</th>
                    <th className="px-4 py-3.5 font-semibold">Dates</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-4 py-3 text-sm">{r.name}</td>
                    <td className="px-4 py-3 text-sm">{r.type}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.days}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusStyles[r.status] || ""}>{r.status}</Badge>
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
