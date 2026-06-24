import { cache } from "react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth/config";
import { getUserOrgId } from "@/lib/org";
import { collections } from "@/lib/db/schema";
import { AdminFileManager } from "./admin-file-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "File Manager" };

type FileCategory = "profile" | "report" | "general";

interface FileItem {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploaderName: string;
  uploaderEmail: string;
  storagePath: string;
  description: string;
  category: FileCategory;
}

interface MemberFolder {
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  createdAt: string;
  hasWorkspace: boolean;
  orgId: string;
  orgName: string;
}

function toFileItem(f: Record<string, unknown>, userMap: Map<string, Record<string, unknown>>): FileItem {
  const u = userMap.get(f.uploaderId as string) as Record<string, unknown> | undefined;
  const cat = (f.category as string) || "general";
  return {
    id: f.id as string,
    originalName: f.originalName as string,
    mimeType: f.mimeType as string,
    size: f.size as number,
    createdAt: f.createdAt as string,
    uploaderName: (u?.name as string) || "Unknown",
    uploaderEmail: (u?.email as string) || "",
    storagePath: f.storagePath as string,
    description: (f.description as string) || "",
    category: (["profile", "report", "general"].includes(cat) ? cat : "general") as FileCategory,
  };
}

async function buildUserMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Record<string, unknown>>();
  const cursor = await db.collection(collections.users).find(
    { id: { $in: [...new Set(userIds)] } },
    { projection: { id: 1, name: 1, email: 1 } },
  );
  const users = await cursor.toArray();
  return new Map(users.map((u: Record<string, unknown>) => [u.id as string, u]));
}

async function ensureWorkspaceFolders(members: { userId: string; name: string; orgId: string }[]) {
  for (const m of members) {
    const existing = await db.collection(collections.fileAttachments).findOne({
      uploaderId: m.userId,
      mimeType: "application/vnd.workspace-folder",
    });
    if (!existing) {
      await db.collection(collections.fileAttachments).insertOne({
        id: `workspace-${m.userId}`,
        orgId: m.orgId,
        uploaderId: m.userId,
        name: `${m.name}'s Workspace`,
        originalName: `${m.name}'s Workspace`,
        mimeType: "application/vnd.workspace-folder",
        size: 0,
        storagePath: `users/${m.userId}/`,
        description: `Auto-created workspace folder for ${m.name}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      });
    }
  }
}

// ── Scoped to a single org ──────────────────────────────────────────

const getOrgFiles = cache(async (orgId: string): Promise<FileItem[]> => {
  const cursor = await db.collection(collections.fileAttachments).find(
    { orgId, deletedAt: null },
    { sort: { createdAt: -1 } },
  );
  const files = await cursor.toArray();
  const uploaderIds = files.map((f: Record<string, unknown>) => f.uploaderId as string);
  const userMap = await buildUserMap(uploaderIds);
  return files.map((f) => toFileItem(f, userMap));
});

const getOrgMembers = cache(async (orgId: string): Promise<MemberFolder[]> => {
  const cursor = await db.collection(collections.orgMembers).find(
    { orgId },
    { projection: { userId: 1, joinedAt: 1 } },
  );
  const members = await cursor.toArray();
  const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
  const userMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const userCursor = await db.collection(collections.users).find(
      { id: { $in: userIds } },
      { projection: { id: 1, name: 1, email: 1, createdAt: 1 } },
    );
    const users = await userCursor.toArray();
    for (const u of users) userMap.set(u.id, u);
  }

  const workspaceIds = new Set<string>();
  const wsCursor = await db.collection(collections.fileAttachments).find(
    { mimeType: "application/vnd.workspace-folder" },
    { projection: { uploaderId: 1 } },
  );
  const workspaces = await wsCursor.toArray();
  for (const w of workspaces) workspaceIds.add(w.uploaderId as string);

  const orgCursor = await db.collection(collections.organizations).findOne(
    { id: orgId },
    { projection: { name: 1 } },
  );
  const orgName = orgCursor?.name || "Organization";

  return members.map((m: Record<string, unknown>) => {
    const u = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    return {
      userId: m.userId as string,
      name: (u?.name as string) || "Unknown",
      email: (u?.email as string) || "",
      joinedAt: m.joinedAt ? new Date(m.joinedAt as string).toISOString() : "",
      createdAt: (u?.createdAt as string) || "",
      hasWorkspace: workspaceIds.has(m.userId as string),
      orgId,
      orgName,
    };
  });
});

// ── Super admin: all orgs ──────────────────────────────────────────

const getAllFiles = cache(async (): Promise<FileItem[]> => {
  const cursor = await db.collection(collections.fileAttachments).find(
    { deletedAt: null },
    { sort: { createdAt: -1 } },
  );
  const files = await cursor.toArray();
  const uploaderIds = files.map((f: Record<string, unknown>) => f.uploaderId as string);
  const userMap = await buildUserMap(uploaderIds);
  return files.map((f) => toFileItem(f, userMap));
});

const getAllMembers = cache(async (): Promise<MemberFolder[]> => {
  const cursor = await db.collection(collections.orgMembers).find(
    {},
    { projection: { userId: 1, orgId: 1, joinedAt: 1 } },
  );
  const members = await cursor.toArray();
  const userIds = [...new Set(members.map((m: Record<string, unknown>) => m.userId as string))];
  const userMap = new Map<string, Record<string, unknown>>();
  if (userIds.length > 0) {
    const userCursor = await db.collection(collections.users).find(
      { id: { $in: userIds } },
      { projection: { id: 1, name: 1, email: 1, createdAt: 1 } },
    );
    const users = await userCursor.toArray();
    for (const u of users) userMap.set(u.id, u);
  }

  const workspaceIds = new Set<string>();
  const wsCursor = await db.collection(collections.fileAttachments).find(
    { mimeType: "application/vnd.workspace-folder" },
    { projection: { uploaderId: 1 } },
  );
  const workspaces = await wsCursor.toArray();
  for (const w of workspaces) workspaceIds.add(w.uploaderId as string);

  const orgIds = [...new Set(members.map((m: Record<string, unknown>) => m.orgId as string))];
  const orgMap = new Map<string, string>();
  if (orgIds.length > 0) {
    const orgCursor = await db.collection(collections.organizations).find(
      { id: { $in: orgIds } },
      { projection: { id: 1, name: 1 } },
    );
    const orgs = await orgCursor.toArray();
    for (const o of orgs) orgMap.set(o.id, o.name);
  }

  return members.map((m: Record<string, unknown>) => {
    const u = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
    const orgId = m.orgId as string;
    return {
      userId: m.userId as string,
      name: (u?.name as string) || "Unknown",
      email: (u?.email as string) || "",
      joinedAt: m.joinedAt ? new Date(m.joinedAt as string).toISOString() : "",
      createdAt: (u?.createdAt as string) || "",
      hasWorkspace: workspaceIds.has(m.userId as string),
      orgId,
      orgName: orgMap.get(orgId) || "Unknown Organization",
    };
  });
});

export default async function AdminFilesPage() {
  const session = await auth();
  const role = session?.user?.role;
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "ORG_MENU_ADMIN";

  let allFiles: FileItem[] = [];
  let members: MemberFolder[] = [];

  if (isSuperAdmin) {
    allFiles = await getAllFiles();
    members = await getAllMembers();
  } else {
    const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;
    allFiles = orgId ? await getOrgFiles(orgId) : [];
    members = orgId ? await getOrgMembers(orgId) : [];
  }

  // Auto-create workspace folders for members who lack them
  const currentOrgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;
  const missingWorkspace = members.filter((m) => !m.hasWorkspace);
  if (missingWorkspace.length > 0) {
    const orgCursor = await db.collection(collections.orgMembers).find(
      { userId: { $in: missingWorkspace.map((m) => m.userId) } },
      { projection: { userId: 1, orgId: 1 } },
    );
    const orgResults = await orgCursor.toArray();
    const foundOrgIds = [...new Set(orgResults.map((r: Record<string, unknown>) => r.orgId as string))];
    await ensureWorkspaceFolders(
      missingWorkspace.map((m) => ({ userId: m.userId, name: m.name, orgId: foundOrgIds[0] || currentOrgId || "" })),
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <AdminFileManager files={allFiles} members={members} />
    </div>
  );
}
