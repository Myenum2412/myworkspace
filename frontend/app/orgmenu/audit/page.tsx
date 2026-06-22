import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs" };

const getLogs = cache(async (orgId: string) => {
  const cursor = await db.collection(collections.activityLogs).find({ orgId });
  return cursor.sort({ createdAt: -1 }).limit(100).toArray();
});

const getAllLogs = cache(async () => {
  const cursor = await db.collection(collections.activityLogs).find({});
  return cursor.sort({ createdAt: -1 }).limit(100).toArray();
});

export default async function AuditPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const logs = isSuperAdmin ? await getAllLogs() : await getLogs(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin ? `All activity across all organizations (${logs.length} entries)` : `Recent activity in your organization (${logs.length} entries)`}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id as string} className="flex items-start gap-3 p-4 text-sm">
                  <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{log.description as string}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-xs">{log.action as string}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {log.createdAt ? new Date(log.createdAt as string).toLocaleString() : ""}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
