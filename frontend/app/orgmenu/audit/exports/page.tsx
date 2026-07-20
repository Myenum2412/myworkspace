import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileTextIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Exports" };

const getAuditExports = cache(async (orgId: string) => {
  const logs = await db.collection(collections.activityLogs).find({ orgId }).sort({ createdAt: -1 }).limit(100).toArray();
  // Group by month
  const monthMap = new Map<string, number>();
  for (const log of logs) {
    const date = log.createdAt ? new Date(log.createdAt as string) : null;
    if (date) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }
  }
  return Array.from(monthMap.entries()).map(([key, count]) => ({
    month: key,
    count,
    label: new Date(key + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" }),
  }));
});

const getAllAuditExports = cache(async () => {
  const logs = await db.collection(collections.activityLogs).find({}).sort({ createdAt: -1 }).limit(100).toArray();
  const monthMap = new Map<string, number>();
  for (const log of logs) {
    const date = log.createdAt ? new Date(log.createdAt as string) : null;
    if (date) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }
  }
  return Array.from(monthMap.entries()).map(([key, count]) => ({
    month: key,
    count,
    label: new Date(key + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" }),
  }));
});

export default async function AuditExportsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "org_admin";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const exports = isSuperAdmin ? await getAllAuditExports() : await getAuditExports(orgId || "null");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Exports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Download exported audit log archives.</p>
          {exports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit logs available for export.</p>
          ) : (
            <div className="space-y-3">
              {exports.map((exp) => (
                <div key={exp.month} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileTextIcon className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{exp.label} Audit Log</p>
                      <p className="text-xs text-muted-foreground">{exp.count} entries</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <DownloadIcon className="size-4 mr-1" /> Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
