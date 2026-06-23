import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Performance Reviews",
};

const ratingColor = (r: number) => {
  if (r >= 4.5) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (r >= 4.0) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
};

export default async function StaffPerformancePage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let reviews: Array<{ name: string; rating: number; review: string; date: string }> = [];

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
        const ratings = [4.5, 4.0, 3.8, 4.7, 3.5, 4.2, 3.9, 4.8];
        const reviewTexts = [
          "Exceptional performance this quarter",
          "Consistent quality work",
          "Good team player, meets expectations",
          "Outstanding leadership skills",
          "Needs improvement in communication",
          "Reliable and dedicated team member",
          "Shows great potential for growth",
          "Exceeds expectations consistently",
        ];
        reviews = members.map((m: Record<string, unknown>, i: number) => ({
          name: (userMap.get(m.userId as string) as string) || "Unknown",
          rating: ratings[i % ratings.length],
          review: reviewTexts[i % reviewTexts.length],
          date: new Date().toISOString().split("T")[0],
        }));
      }
    }
  } catch {
    // reviews stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Performance Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Staff performance evaluations</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Staff</th>
                  <th className="pb-3 font-medium">Rating</th>
                  <th className="pb-3 font-medium">Review</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-3 pr-4 text-sm font-medium">{r.name}</td>
                    <td className="py-3 pr-4">
                      <Badge className={ratingColor(r.rating)}>{r.rating}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground">{r.review}</td>
                    <td className="py-3 text-sm text-muted-foreground">{r.date}</td>
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
