import { Suspense } from "react";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import FilesInteractive from "./files-interactive";

export const dynamic = "force-dynamic";

type ClientFolder = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId: string | null;
};

type ClientRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  status: string;
};

type OrgInfo = {
  id: string;
  name: string;
  logoUrl?: string;
  companyEmail?: string;
  website?: string;
  industry?: string;
  plan?: string;
};

type FileStats = {
  totalSize?: number;
  totalFiles?: number;
  deletedFiles?: number;
  usedStorage?: number;
  maxStorage?: number;
};

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  if (!orgId) {
    return (
      <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
        <FilesInteractive
          orgInfo={null}
          clients={[]}
          foldersByClient={{}}
          statsByClient={{}}
          stats={null}
        />
      </Suspense>
    );
  }

  // Fetch org details (orgId may be a uuid string or an ObjectId string)
  let orgObjId: ObjectId | undefined;
  try { orgObjId = new ObjectId(orgId); } catch { /* not an ObjectId */ }
  const org = (await db.collection(collections.organizations).findOne(
    orgObjId ? { $or: [{ id: orgId }, { _id: orgObjId }] } : { id: orgId }
  )) as Record<string, unknown> | null;

  const orgInfo: OrgInfo | null = org
    ? {
        id: (org.id as string) || String(org._id || ""),
        name: (org.name as string) || "",
        logoUrl: (org.logoUrl as string) || (org.logo as string) || undefined,
        companyEmail: (org.companyEmail as string) || undefined,
        website: (org.website as string) || undefined,
        industry: (org.industry as string) || undefined,
        plan: (org.plan as string) || "starter",
      }
    : null;

  // Fetch clients, folders, and stats in parallel
  const [clientDocs, folderDocs, totalFilesAgg, totalFilesCount, deletedFilesCount] = await Promise.all([
    db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).toArray() as Promise<Record<string, unknown>[]>,
    db.collection(collections.folders).find({ orgId, deletedAt: null, parentId: null }).sort({ name: 1 }).toArray() as Promise<Record<string, unknown>[]>,
    db.collection(collections.fileAttachments).aggregate([
      { $match: { orgId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]).toArray() as Promise<Array<{ _id: null; total: number }>>,
    db.collection(collections.fileAttachments).countDocuments({ orgId, deletedAt: null }),
    db.collection(collections.fileAttachments).countDocuments({ orgId, deletedAt: { $ne: null } }),
  ]);

  const clients: ClientRecord[] = clientDocs.map((c) => ({
    id: (c.id as string) || String(c._id || ""),
    name: (c.name as string) || "",
    company: (c.company as string) || "",
    email: (c.email as string) || "",
    status: (c.status as string) || "",
  }));

  // Group folders by clientId (only top-level, parentId === null already filtered)
  const foldersByClient: Record<string, ClientFolder[]> = {};
  for (const f of folderDocs) {
    const key = (f.clientId as string) || "__org__";
    if (!foldersByClient[key]) foldersByClient[key] = [];
    foldersByClient[key].push({
      id: (f.id as string) || String(f._id || ""),
      name: (f.name as string) || "",
      path: (f.path as string) || "",
      parentId: f.parentId ? String(f.parentId) : null,
      clientId: f.clientId ? String(f.clientId) : null,
    });
  }

  // Per-client file stats
  const statsEntries = await Promise.all(
    clients.map(async (c) => {
      const [filesAgg, filesCount] = await Promise.all([
        db.collection(collections.fileAttachments).aggregate([
          { $match: { orgId, clientId: c.id, deletedAt: null } },
          { $group: { _id: null, total: { $sum: "$size" } } },
        ]).toArray() as Promise<Array<{ _id: null; total: number }>>,
        db.collection(collections.fileAttachments).countDocuments({ orgId, clientId: c.id, deletedAt: null }),
      ]);
      return [c.id, { files: filesCount, size: filesAgg[0]?.total || 0 }] as const;
    }),
  );
  const statsByClient: Record<string, { files: number; size: number }> = Object.fromEntries(statsEntries);

  const stats: FileStats = {
    totalSize: totalFilesAgg[0]?.total || 0,
    totalFiles: totalFilesCount,
    deletedFiles: deletedFilesCount,
  };

  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12">Loading...</div>}>
      <FilesInteractive
        orgInfo={orgInfo}
        clients={clients}
        foldersByClient={foldersByClient}
        statsByClient={statsByClient}
        stats={stats}
      />
    </Suspense>
  );
}
