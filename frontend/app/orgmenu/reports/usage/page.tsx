import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3Icon, HardDriveIcon, UsersIcon, ActivityIcon } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Usage Reports" };

const getUsageData = cache(async (orgId: string) => {
  const [storage, members, files, tasks] = await Promise.all([
    db.collection(collections.storageQuotas).findOne({ orgId }),
    db.collection(collections.orgMembers).countDocuments({ orgId }),
    db.collection(collections.fileAttachments).countDocuments({ orgId }),
    db.collection(collections.tasks).countDocuments({ orgId }),
  ]);
  const usedBytes = (storage?.usedStorageBytes as number) || 0;
  const maxBytes = (storage?.maxStorageBytes as number) || (1024 * 1024 * 1024);
  return {
    storageUsed: usedBytes,
    storageMax: maxBytes,
    members,
    files,
    tasks,
  };
});

const getAllUsageData = cache(async () => {
  const [storageDocs, members, files, tasks] = await Promise.all([
    db.collection(collections.storageQuotas).find({}).toArray(),
    db.collection(collections.orgMembers).countDocuments({}),
    db.collection(collections.fileAttachments).countDocuments({}),
    db.collection(collections.tasks).countDocuments({}),
  ]);
  const usedBytes = storageDocs.reduce((sum, s) => sum + ((s.usedStorageBytes as number) || 0), 0);
  const maxBytes = storageDocs.reduce((sum, s) => sum + ((s.maxStorageBytes as number) || 0), 0) || (1024 * 1024 * 1024);
  return {
    storageUsed: usedBytes,
    storageMax: maxBytes,
    members,
    files,
    tasks,
  };
});

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default async function UsageReportsPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  const usage = isSuperAdmin ? await getAllUsageData() : await getUsageData(orgId || "null");

  const storagePct = usage.storageMax > 0 ? Math.round((usage.storageUsed / usage.storageMax) * 100) : 0;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usage Reports</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3Icon className="size-5" />
            Resource Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Monitor storage, API calls, and resource utilization across your organization.
          </p>
        </CardContent>
      </Card>
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <HardDriveIcon className="size-3.5" /> Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(usage.storageUsed)}</div>
            <p className="text-xs text-muted-foreground mt-1">of {formatBytes(usage.storageMax)} ({storagePct}%)</p>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(storagePct, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <UsersIcon className="size-3.5" /> Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.members}</div>
            <p className="text-xs text-muted-foreground mt-1">active members</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <ActivityIcon className="size-3.5" /> Files & Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usage.files}</div>
            <p className="text-xs text-muted-foreground mt-1">files uploaded</p>
            <div className="text-lg font-bold mt-2">{usage.tasks}</div>
            <p className="text-xs text-muted-foreground">total tasks</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
