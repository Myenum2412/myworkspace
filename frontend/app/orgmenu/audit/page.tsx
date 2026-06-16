import { cache } from "react";
import { db } from "@/lib/db";
import { schema } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Audit Logs" };

const getLogs = cache(async (orgId: string) => {
  return db
    .select()
    .from(schema.activityLogs)
    .where(eq(schema.activityLogs.orgId, orgId))
    .orderBy(desc(schema.activityLogs.createdAt))
    .limit(50)
    .all();
});

export default async function AuditPage() {
  const logs = await getLogs("demo-org-id");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
      </div>
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-4 text-sm">
                  <div className="size-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{log.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.action} &middot; {log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}
                    </p>
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
