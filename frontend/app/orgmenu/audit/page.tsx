import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
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

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f3f4f6] text-gray-900 border-b">
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">User</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Action</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap max-w-md">Description</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Entity</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Timestamp</th>
              {isSuperAdmin && <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Organization</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr className="bg-white group hover:bg-slate-50 transition-colors">
                <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-3 h-32 text-center text-muted-foreground">
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="bg-white group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{log.userName}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${actionColors[log.action] || "bg-muted text-muted-foreground"}`}>
                      {log.action.replace(/^[^.]+\./, "")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 max-w-md truncate" title={log.description}>
                    {log.description}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {log.entityType ? `${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmt(log.createdAt)}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-muted-foreground">{log.orgName || "—"}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
