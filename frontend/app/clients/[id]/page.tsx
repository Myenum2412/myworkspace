import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect, notFound } from "next/navigation";
import type { ClientWorkspaceResponse } from "./client-workspace";
import ClientWorkspace from "./client-workspace";

export const dynamic = "force-dynamic";

export default async function ClientWorkspacePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) redirect("/login");

  const clientId = params.id;

  const clientDoc = await db
    .collection(collections.clients)
    .findOne({ id: clientId, orgId });
  if (!clientDoc) notFound();

  const [workspaceDoc, folderDocs, fileDocs, activityDocs, projectCount, reportCount] = await Promise.all([
    db.collection("client_workspaces").findOne({ orgId, clientId }),
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

  if (!workspaceDoc) notFound();

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
