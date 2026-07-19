import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3Icon, ActivityIcon, UsersIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity Reports" };

const getActivityData = cache(async (orgId: string) => {
  const [totalActivities, recentActivities, activeUsers] = await Promise.all([
    db.collection(collections.activityLogs).countDocuments({ orgId }),
    db.collection(collections.activityLogs).find({ orgId }).sort({ createdAt: -1 }).limit(5).toArray(),
    db.collection(collections.users).countDocuments({ status: "online" }),
  ]);

  // Group activities by type
  const typePipeline = [
    { $match: { orgId } },
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ];
  const activitiesByType = await db.collection(collections.activityLogs).aggregate(typePipeline).toArray();

  return {
    totalActivities,
    recentActivities: recentActivities.map((a) => ({
      type: (a.type as string) || "unknown",
      description: (a.description as string) || "",
      createdAt: a.createdAt ? new Date(a.createdAt as string).toLocaleDateString() : "",
    })),
    activeUsers,
    activitiesByType: activitiesByType.map((t) => ({ type: (t._id as string) || "unknown", count: t.count as number })),
  };
});

const getAllActivityData = cache(async () => {
  const [totalActivities, recentActivities, activeUsers] = await Promise.all([
    db.collection(collections.activityLogs).countDocuments({}),
    db.collection(collections.activityLogs).find({}).sort({ createdAt: -1 }).limit(5).toArray(),
    db.collection(collections.users).countDocuments({ status: "online" }),
  ]);

  const typePipeline = [
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ];
  const activitiesByType = await db.collection(collections.activityLogs).aggregate(typePipeline).toArray();

  return {
    totalActivities,
    recentActivities: recentActivities.map((a) => ({
      type: (a.type as string) || "unknown",
      description: (a.description as string) || "",
      createdAt: a.createdAt ? new Date(a.createdAt as string).toLocaleDateString() : "",
    })),
    activeUsers,
    activitiesByType: activitiesByType.map((t) => ({ type: (t._id as string) || "unknown", count: t.count as number })),
  };
});

export default async function ActivityReportsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const data = isSuperAdmin ? await getAllActivityData() : await getActivityData(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity Reports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="size-5" />
            Team Activity Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Track team activity trends, login frequency, and collaboration patterns.
          </p>
        </CardContent>
      </Card>
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ActivityIcon className="size-3.5" /> Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalActivities}</div>
            <p className="text-xs text-muted-foreground mt-1">total activities logged</p>
            {data.activitiesByType.length > 0 && (
              <div className="mt-3 space-y-1">
                {data.activitiesByType.slice(0, 5).map((t) => (
                  <div key={t.type} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</span>
                    <span className="font-medium">{t.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <UsersIcon className="size-3.5" /> User Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">users currently online</p>
            {data.recentActivities.length > 0 && (
              <div className="mt-3 space-y-2">
                {data.recentActivities.map((a, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium capitalize">{a.type.replace(/_/g, " ")}</span>
                    {a.description && <span className="text-muted-foreground"> — {a.description}</span>}
                    <span className="text-muted-foreground ml-1">{a.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
