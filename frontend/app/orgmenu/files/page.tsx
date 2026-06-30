import { cache } from "react";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { ClientFileManager } from "./client-file-manager-interactive";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client File Manager" };

type ClientFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId: string | null;
  permissions?: {
    clientCanView: boolean;
    clientCanUpload: boolean;
    clientCanDelete: boolean;
  };
};

type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

type ClientStats = { files: number; size: number };

const getClients = cache(async (orgId: string): Promise<ClientRecord[]> => {
  const raw = await db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).toArray();
  return (raw as unknown as Record<string, unknown>[]).map((c) => ({
    id: (c.id as string) || "",
    name: (c.name as string) || "",
    company: (c.company as string) || "",
    email: (c.email as string) || "",
    status: (c.status as string) || "",
  }));
});

const getFolders = cache(async (orgId: string): Promise<Record<string, ClientFolder[]>> => {
  const raw = await db.collection(collections.folders).find({ orgId, deletedAt: null }).sort({ path: 1 }).toArray();
  const grouped: Record<string, ClientFolder[]> = {};
  for (const f of raw as unknown as Record<string, unknown>[]) {
    if (f.parentId !== null && f.parentId !== undefined) continue;
    const clientId = (f.clientId as string) || "__org__";
    if (!grouped[clientId]) grouped[clientId] = [];
    grouped[clientId].push({
      id: (f.id as string) || "",
      name: (f.name as string) || "",
      path: (f.path as string) || "",
      parentId: f.parentId ? (f.parentId as string) : null,
      clientId: f.clientId ? (f.clientId as string) : null,
    });
  }
  return grouped;
});

const getStats = cache(async (orgId: string, clientId: string): Promise<ClientStats> => {
  const [totalFiles, totalSizeAgg] = await Promise.all([
    db.collection(collections.fileAttachments).countDocuments({ orgId, clientId, deletedAt: null }),
    db.collection(collections.fileAttachments).aggregate([
      { $match: { orgId, clientId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]).toArray(),
  ]);
  const totalSize = (totalSizeAgg as unknown as { total: number }[])[0]?.total || 0;
  return { files: totalFiles, size: totalSize };
});

export default async function OrgMenuFilesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">You must be signed in to view client files.</p>
      </div>
    );
  }

  const orgId = await getUserOrgId(session.user.id);
  if (!orgId) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <p className="text-sm text-muted-foreground">No organization found for your account.</p>
      </div>
    );
  }

  const [clients, foldersByClient] = await Promise.all([
    getClients(orgId),
    getFolders(orgId),
  ]);

  // Per-client stats
  const statsEntries = await Promise.all(
    clients.map(async (c) => {
      const stats = await getStats(orgId, c.id);
      return [c.id, stats] as const;
    }),
  );
  const statsByClient: Record<string, ClientStats> = Object.fromEntries(statsEntries);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <ClientFileManager
        orgId={orgId}
        userId={session.user.id}
        clients={clients}
        foldersByClient={foldersByClient}
        statsByClient={statsByClient}
      />
    </div>
  );
}
