import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { ObjectId } from "mongodb";
import { Badge } from "@/components/ui/badge";
import { HistoryIcon, FileIcon, FolderIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "File Manager Audit Log" };

interface AuditLog {
  _id: string;
  action: string;
  description: string;
  entityType: string;
  entityId?: string;
  createdAt?: string;
  userName: string;
}

const actionColors: Record<string, string> = {
  "file.uploaded": "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "file.downloaded": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "file.deleted": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "file.renamed": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "file.shared": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "file.locked": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "file.unlocked": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "folder.created": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "folder.renamed": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  "folder.deleted": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  "folder.moved": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

function getActionColor(action: string): string {
  return actionColors[action] || "bg-muted text-muted-foreground";
}

function fmtDate(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

async function resolveOrgObjectId(userId: string): Promise<string | null> {
  const uuidOrgId = await getUserOrgId(userId);
  if (!uuidOrgId) return null;

  const org = await db.collection(collections.organizations).findOne(
    { id: uuidOrgId },
    { projection: { _id: 1 } },
  );
  if (org?._id) return org._id.toString();

  let byObjectId: Record<string, unknown> | null = null;
  try {
    if (ObjectId.isValid(uuidOrgId)) {
      byObjectId = await db.collection(collections.organizations).findOne(
        { _id: new ObjectId(uuidOrgId) },
        { projection: { _id: 1 } },
      ) as Record<string, unknown> | null;
    }
  } catch {}
  return byObjectId?._id?.toString() || null;
}

const getLogs = cache(async (objectIdOrgId: string): Promise<AuditLog[]> => {
  const cursor = db.collection(collections.activityLogs).find(
    { orgId: objectIdOrgId, entityType: { $in: ["file", "folder"] } },
    { sort: { createdAt: -1 }, limit: 100 },
  );
  const logs = await cursor.toArray() as Record<string, unknown>[];

  const userIds = [...new Set(logs.map((l) => l.userId as string).filter(Boolean))];
  const users = userIds.length > 0
    ? await (await db.collection(collections.users).find(
        { id: { $in: userIds } },
        { projection: { id: 1, name: 1 } },
      )).toArray()
    : [];
  const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u.name as string]));

  return logs.map((l) => ({
    _id: String(l._id || ""),
    action: String(l.action || ""),
    description: String(l.description || ""),
    entityType: String(l.entityType || ""),
    entityId: l.entityId as string | undefined,
    createdAt: l.createdAt ? new Date(l.createdAt as string).toISOString() : undefined,
    userName: userMap.get(l.userId as string) || "Unknown",
  }));
});

export default async function FileAuditLogPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return <div className="flex flex-1 flex-col gap-4 p-4 pt-0"><p className="text-red-500">Please sign in to view audit logs.</p></div>;
  }

  const objectIdOrgId = await resolveOrgObjectId(userId);
  if (!objectIdOrgId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HistoryIcon className="size-6" />
              File Manager Audit Log
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all file and folder operations in your organization
            </p>
          </div>
        </div>
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No organization found for your account.
        </div>
      </div>
    );
  }

  const logs = await getLogs(objectIdOrgId);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HistoryIcon className="size-6" />
            File Manager Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Recent file and folder operations in your organization ({logs.length} entries)
          </p>
        </div>
      </div>

      <div className="border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="table-premium w-full text-sm text-left">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#f3f4f6] text-gray-900 border-b">
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">User</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Action</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap max-w-md">Description</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Entity</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 ? (
              <tr className="bg-white group hover:bg-slate-50 transition-colors">
                <td colSpan={5} className="px-4 py-3 h-32 text-center text-muted-foreground">
                  No file or folder activity found
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log._id} className="bg-white group hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium">{log.userName}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${getActionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 max-w-md truncate" title={log.description}>
                    {log.description}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground capitalize">
                      {log.entityType === "folder" ? (
                        <FolderIcon className="size-4 shrink-0" />
                      ) : (
                        <FileIcon className="size-4 shrink-0" />
                      )}
                      {log.entityType}
                      {log.entityId && (
                        <span className="text-xs text-muted-foreground/60">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {fmtDate(log.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
