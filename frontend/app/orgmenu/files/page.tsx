import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { ClientFileManager, type ClientFolder } from "./client-file-manager-interactive";

type MongoDoc = { id?: string; _id?: unknown };

type ClientDoc = MongoDoc & {
  name?: string;
  company?: string;
  companyName?: string;
  email?: string;
  status?: string;
};

type FolderDoc = MongoDoc & {
  name?: string;
  path?: string;
  parentId?: string | null;
  clientId?: string | null;
  permissions?: unknown;
};

type AttachmentDoc = {
  clientId?: string | null;
  size?: number | string;
};

function idOf(doc: MongoDoc): string {
  return doc.id || String(doc._id || "");
}

function stringOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export default async function OrgMenuFilesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const orgId = session.user.orgId || (await getUserOrgId(session.user.id, session.user.email));
  if (!orgId) {
    return (
      <ClientFileManager orgId="" userId="" clients={[]} foldersByClient={{}} statsByClient={{}} />
    );
  }

  try {
    const [clientDocs, folderDocs, fileDocs] = await Promise.all([
      db.collection(collections.clients).find({ orgId }).toArray(),
      db.collection(collections.folders).find({ orgId, deletedAt: null }).toArray(),
      db.collection(collections.fileAttachments).find({ orgId }).toArray(),
    ]);

    const clients = (clientDocs as unknown as ClientDoc[]).map((c) => ({
      id: idOf(c),
      name: stringOf(c.name || c.companyName),
      company: stringOf(c.company || c.companyName),
      email: stringOf(c.email),
      status: stringOf(c.status),
    }));

    const foldersByClient: Record<string, ClientFolder[]> = {};
    for (const f of folderDocs as unknown as FolderDoc[]) {
      const clientId = f.clientId || null;
      if (!clientId) continue;
      if (!foldersByClient[clientId]) foldersByClient[clientId] = [];
      const rawPerms = f.permissions as
        | { clientCanView?: unknown; clientCanUpload?: unknown; clientCanDelete?: unknown }
        | null
        | undefined;
      foldersByClient[clientId].push({
        id: idOf(f),
        name: stringOf(f.name),
        path: stringOf(f.path),
        parentId: f.parentId || null,
        clientId,
        permissions: rawPerms
          ? {
              clientCanView: Boolean(rawPerms.clientCanView),
              clientCanUpload: Boolean(rawPerms.clientCanUpload),
              clientCanDelete: Boolean(rawPerms.clientCanDelete),
            }
          : undefined,
      });
    }

    const statsByClient: Record<string, { files: number; size: number }> = {};
    for (const file of fileDocs as unknown as AttachmentDoc[]) {
      const clientId = file.clientId;
      if (!clientId) continue;
      if (!statsByClient[clientId]) statsByClient[clientId] = { files: 0, size: 0 };
      statsByClient[clientId].files += 1;
      statsByClient[clientId].size += Number(file.size || 0);
    }

    return (
      <ClientFileManager
        orgId={orgId}
        userId={session.user.id}
        clients={clients}
        foldersByClient={foldersByClient}
        statsByClient={statsByClient}
      />
    );
  } catch {
    return (
      <ClientFileManager
        orgId={orgId}
        userId={session.user.id}
        clients={[]}
        foldersByClient={{}}
        statsByClient={{}}
      />
    );
  }
}
