import { cache } from "react";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityIcon } from "lucide-react";

const getRecentActivity = cache(async (orgId: string) => {
  return db
    .collection(collections.activityLogs)
    .find({ orgId })
    .sort({ createdAt: -1 })
    .limit(10)
    .toArray();
});

export async function RecentActivityFeed({ orgId }: { orgId: string }) {
  const activities = await getRecentActivity(orgId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ActivityIcon className="size-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 text-sm">
                <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
