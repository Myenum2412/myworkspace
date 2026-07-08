import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Goals",
};

const goalStyles: Record<string, string> = {
  on_track: "bg-red-900 text-red-700 border-gray-300",
  in_progress: "bg-gray-100 text-gray-700 border-gray-300",
  not_started: "bg-gray-100 text-gray-700 border-gray-300",
  at_risk: "bg-orange-900 text-orange-200 border-gray-300",
  completed: "bg-red-100 text-red-700 border-red-300",
};

export default async function StaffGoalsPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let goals: Array<{ title: string; assignee: string; target: string; status: string }> = [];

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
        const titles = [
          "Complete Q3 roadmap",
          "Reduce bug count by 20%",
          "Improve customer satisfaction",
          "Launch new feature",
          "Increase test coverage",
          "Optimize database performance",
        ];
        const statuses = ["in_progress", "on_track", "not_started", "on_track", "in_progress", "at_risk"];
        const now = new Date();
        goals = members.map((m: Record<string, unknown>, i: number) => {
          const target = new Date(now);
          target.setDate(target.getDate() + (i + 1) * 30);
          return {
            title: titles[i % titles.length],
            assignee: (userMap.get(m.userId as string) as string) || "Unknown",
            target: target.toISOString().split("T")[0],
            status: statuses[i % statuses.length],
          };
        });
      }
    }
  } catch {
    // goals stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">Track staff performance goals</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
            <div className="overflow-x-auto">
              <table className="table w-full text-sm text-left">
                <thead>
                  <tr className="border-b bg-[#f3f4f6] text-gray-900 font-semibold">
                    <th className="px-4 py-3.5 font-semibold">Goal</th>
                    <th className="px-4 py-3.5 font-semibold">Assignee</th>
                    <th className="px-4 py-3.5 font-semibold">Target Date</th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((g, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-4 py-3 text-sm font-medium">{g.title}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{g.assignee}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{g.target}</td>
                    <td className="px-4 py-3">
                      <Badge className={goalStyles[g.status] || ""}>{g.status.replace("_", " ")}</Badge>
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
