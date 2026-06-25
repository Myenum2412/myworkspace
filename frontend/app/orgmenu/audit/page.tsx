import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Audit Logs" };

interface AuditLog {
  id: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string;
  createdAt?: string;
  userName: string;
  orgName?: string;
}

const getLogs = cache(async (orgId: string): Promise<AuditLog[]> => {
  const cursor = await db.collection(collections.activityLogs).find(
    { orgId },
    { sort: { createdAt: -1 } },
  );
  const logs = await cursor.toArray();
  return enrichLogs(logs, orgId);
});

const getAllLogs = cache(async (): Promise<AuditLog[]> => {
  const cursor = await db.collection(collections.activityLogs).find(
    {},
    { sort: { createdAt: -1 } },
  );
  const logs = await cursor.toArray();
  const orgIds = [...new Set(logs.map((l: Record<string, unknown>) => l.orgId as string))];
  return enrichLogs(logs, null, orgIds);
});

async function enrichLogs(logs: Record<string, unknown>[], scopeOrgId: string | null, orgIds?: string[]): Promise<AuditLog[]> {
  const userIds = [...new Set(logs.map((l: Record<string, unknown>) => l.userId as string))];
  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find(
        { id: { $in: userIds } },
        { projection: { id: 1, name: 1, email: 1 } },
      )).toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u.name as string]));

  const orgMap = new Map<string, string>();
  const ids = orgIds || (scopeOrgId ? [scopeOrgId] : []);
  if (ids.length > 0) {
    const orgs = await (await db.collection(collections.organizations).find(
      { id: { $in: ids } },
      { projection: { id: 1, name: 1 } },
    )).toArray();
    for (const o of orgs) {
      orgMap.set(o.id as string, o.name as string);
    }
  }

  return logs
    .map((l: Record<string, unknown>) => ({
      id: String(l.id || l._id || ""),
      action: String(l.action || ""),
      description: String(l.description || ""),
      entityType: String(l.entityType || ""),
      entityId: String(l.entityId || ""),
      createdAt: l.createdAt ? new Date(l.createdAt as string).toISOString() : undefined,
      userName: userMap.get(l.userId as string) || "Unknown",
      orgName: orgMap.get(l.orgId as string),
    }))
    .filter((a) => a.userName !== "Unknown");
}

const actionColors: Record<string, string> = {
  "user.login": "bg-gray-700 text-gray-700",
  "user.logout": "bg-slate-100 text-slate-700",
  "user.joined": "bg-red-900 text-red-700",
  "task.created": "bg-gray-200 text-gray-700",
  "task.completed": "bg-red-900 text-red-700",
  "task.assigned": "bg-gray-700 text-gray-700",
  "file.uploaded": "bg-cyan-100 text-cyan-700",
  "member.invited": "bg-indigo-100 text-indigo-700",
  "member.role_changed": "bg-orange-100 text-orange-700",
  "settings.updated": "bg-pink-100 text-pink-700",
};

function fmt(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader className="bg-blue-50">
            <TableRow>
              <TableHead className="bg-blue-50">User</TableHead>
              <TableHead className="bg-blue-50">Action</TableHead>
              <TableHead className="bg-blue-50 max-w-md">Description</TableHead>
              <TableHead className="bg-blue-50">Entity</TableHead>
              <TableHead className="bg-blue-50">Timestamp</TableHead>
              {isSuperAdmin && <TableHead className="bg-blue-50">Organization</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isSuperAdmin ? 6 : 5} className="h-32 text-center text-muted-foreground">
                  No audit logs found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="bg-white">
                  <TableCell className="text-sm font-medium">{log.userName}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                      {log.action.replace(/^[^.]+\./, "")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-md truncate" title={log.description}>
                    {log.description}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmt(log.createdAt)}</TableCell>
                  {isSuperAdmin && (
                    <TableCell className="text-sm text-muted-foreground">{log.orgName || "—"}</TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
