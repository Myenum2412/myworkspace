import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect, notFound } from "next/navigation";
import { v4 as uuid } from "uuid";
import type { ClientWorkspaceResponse } from "./client-workspace";
import ClientWorkspace from "./client-workspace";

export const dynamic = "force-dynamic";

export default async function ClientWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = session.user.orgId || await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) redirect("/login");

  const { id: clientId } = await params;

  const clientDoc = await db
    .collection(collections.clients)
    .findOne({ id: clientId, orgId });
  if (!clientDoc) notFound();

  let workspaceDoc = await db.collection("client_workspaces").findOne({ orgId, clientId });

  const [folderDocs, fileDocs, activityDocs, projectCount, reportCount] = await Promise.all([
    db
      .collection(collections.folders)
      .find({ orgId, clientId, deletedAt: null })
      .sort({ path: 1 })
      .toArray(),
    db
      .collection(collections.fileAttachments)
      .find({ orgId, clientId, deletedAt: null })
      .sort({ updatedAt: -1 })
      .limit(25)
      .toArray(),
    db
      .collection(collections.activityLogs)
      .find({ orgId, entityId: clientId })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray(),
    db.collection(collections.projects).countDocuments({ orgId, client: clientDoc.name }),
    db
      .collection(collections.fileAttachments)
      .countDocuments({ orgId, clientId, category: "report", deletedAt: null }),
  ]);

  // Auto-provision workspace for clients created before the workspace document existed.
  if (!workspaceDoc) {
    const newWsId = uuid();
    await db.collection("client_workspaces").insertOne({
      id: newWsId,
      orgId,
      clientId,
      dashboardEnabled: true,
      fileManagementEnabled: true,
      modules: ["dashboard", "files", "projects", "reports", "settings"],
      defaultFolderIds: (folderDocs as Record<string, unknown>[]).map((f: Record<string, unknown>) => f.id as string),
      permissions: {
        clientCanViewDashboard: true,
        clientCanViewFiles: true,
        clientCanUploadFiles: true,
        clientCanDeleteFiles: false,
      },
      createdBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    // Re-fetch so the rest of the handler has the workspace doc.
    workspaceDoc = await db.collection("client_workspaces").findOne({ orgId, clientId });
  }

  const clientFileDocs: Record<string, unknown>[] = fileDocs as Record<string, unknown>[];
  const folders = folderDocs as unknown as ClientWorkspaceResponse["fileManagement"]["folders"];
  const files: ClientWorkspaceResponse["dashboard"]["recentFiles"] = clientFileDocs.map((f) => ({
    id: String(f.id ?? ""),
    name: String(f.name ?? ""),
    originalName: String(f.originalName ?? f.name ?? ""),
    mimeType: String(f.mimeType ?? ""),
    size: Number(f.size ?? 0),
    category: String(f.category ?? ""),
    folderId: (f.folderId as string | null) ?? null,
    updatedAt: String(f.updatedAt ?? f.createdAt ?? ""),
  }));
  const folderPermissions = (workspaceDoc as Record<string, unknown>).permissions as
    | ClientWorkspaceResponse["workspace"]["permissions"]
    | undefined;

  const workspace = workspaceDoc as unknown as ClientWorkspaceResponse["workspace"] & {
    modules?: string[];
    permissions?: ClientWorkspaceResponse["workspace"]["permissions"];
  };

  const client: ClientWorkspaceResponse["client"] = {
    id: String(clientDoc.id ?? ""),
    name: String(clientDoc.name ?? ""),
    company: String(clientDoc.company ?? ""),
    email: String(clientDoc.email ?? ""),
    status: String(clientDoc.status ?? ""),
    projects: Number(clientDoc.projects ?? projectCount),
    primaryContact: (clientDoc.primaryContact as string) || undefined,
  };

  const data: ClientWorkspaceResponse = {
    client,
    workspace: {
      id: (workspaceDoc as Record<string, unknown>).id as string ?? "",
      clientId,
      dashboardEnabled: Boolean((workspaceDoc as Record<string, unknown>).dashboardEnabled),
      fileManagementEnabled: Boolean((workspaceDoc as Record<string, unknown>).fileManagementEnabled),
      modules: workspace.modules ?? [],
      permissions: folderPermissions ?? {
        clientCanViewDashboard: true,
        clientCanViewFiles: true,
        clientCanUploadFiles: false,
        clientCanDeleteFiles: false,
      },
    },
    dashboard: {
      metrics: {
        folders: folders.length,
        files: files.length,
        projects: projectCount,
        reports: reportCount,
        storageBytes: clientFileDocs.reduce((sum: number, f) => sum + (Number(f.size) || 0), 0),
      },
      recentFiles: files.slice(0, 5),
    },
    fileManagement: {
      folders,
      files,
    },
  };

  return <ClientWorkspace data={data} />;
}
