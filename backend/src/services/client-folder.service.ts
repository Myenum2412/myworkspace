import { v4 as uuid } from "uuid";
import { Folder } from "../lib/db/models/Folder.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { recordAuditLog } from "./audit.service.js";
import { CLIENT_SUBFOLDERS, CLIENT_BASE_FOLDER } from "../lib/uploads/folder-mapper.js";
import { cacheManager } from "../lib/cache.js";

export interface ClientFolderOptions {
  orgId: string;
  clientId: string;
  clientName?: string;
  createdBy: string;
}

export interface AutoRouteOptions {
  orgId: string;
  clientId: string;
  moduleName: string;
  entityId?: string;
  createdBy: string;
}

export async function ensureClientFolders(options: ClientFolderOptions): Promise<{ rootFolderId: string; subfolderIds: Record<string, string> }> {
  const { orgId, clientId, clientName, createdBy } = options;

  const rootPath = `/${CLIENT_BASE_FOLDER}/${clientId}`;
  let rootFolder = await Folder.findOne({ orgId, path: rootPath, deletedAt: null }).lean();
  let rootFolderId: string;

  if (rootFolder) {
    rootFolderId = rootFolder.id;
  } else {
    rootFolderId = uuid();
    await Folder.create({
      id: rootFolderId,
      orgId,
      clientId,
      parentId: null,
      name: clientName || clientId,
      path: rootPath,
      permissions: { clientCanView: true, clientCanUpload: true, clientCanDelete: false },
      createdBy,
    });
    await recordAuditLog({
      orgId, userId: createdBy, createdBy,
      action: "folder.created", entityType: "folder", entityId: rootFolderId,
      description: `Client root folder created for ${clientName || clientId}`,
    });
  }

  const subfolderIds: Record<string, string> = {};
  const existingSubs = await Folder.find({ orgId, clientId, parentId: rootFolderId, deletedAt: null }).lean();
  const existingNames = new Set(existingSubs.map((f) => f.name));

  for (const subName of CLIENT_SUBFOLDERS) {
    if (existingNames.has(subName)) {
      const existing = existingSubs.find((f) => f.name === subName)!;
      subfolderIds[subName] = existing.id;
      continue;
    }

    const subId = uuid();
    await Folder.create({
      id: subId,
      orgId,
      clientId,
      parentId: rootFolderId,
      name: subName,
      path: `${rootPath}/${subName}`,
      permissions: { clientCanView: true, clientCanUpload: subName !== "Reports", clientCanDelete: false },
      createdBy,
    });
    subfolderIds[subName] = subId;
  }

  cacheManager.invalidatePattern(`folders:${orgId}`);

  return { rootFolderId, subfolderIds };
}

export async function ensureClientProjectFolder(options: {
  orgId: string;
  clientId: string;
  projectName?: string;
  createdBy: string;
}): Promise<string> {
  const { orgId, clientId, projectName, createdBy } = options;

  const rootPath = `/${CLIENT_BASE_FOLDER}/${clientId}`;
  const projectsPath = `${rootPath}/Projects`;
  let projectsFolder = await Folder.findOne({ orgId, path: projectsPath, deletedAt: null }).lean();
  if (!projectsFolder) {
    const folders = await ensureClientFolders({ orgId, clientId, createdBy });
    projectsFolder = await Folder.findOne({ id: folders.subfolderIds["Projects"] }).lean();
    if (!projectsFolder) return "";
  }

  const name = projectName || "Unnamed Project";
  const projectPath = `${projectsPath}/${name}`;
  let projectFolder = await Folder.findOne({ orgId, path: projectPath, deletedAt: null }).lean();
  if (projectFolder) return projectFolder.id;

  const folderId = uuid();
  await Folder.create({
    id: folderId,
    orgId,
    clientId,
    parentId: projectsFolder.id,
    name,
    path: projectPath,
    permissions: { clientCanView: true, clientCanUpload: true, clientCanDelete: false },
    createdBy,
  });

  cacheManager.invalidatePattern(`folders:${orgId}`);
  return folderId;
}

export async function resolveClientFolder(
  orgId: string,
  clientId: string,
  moduleName: string,
  createdBy: string,
  projectName?: string,
): Promise<string | null> {
  const { subfolderIds } = await ensureClientFolders({ orgId, clientId, createdBy });

  if (moduleName === "project" && projectName) {
    return ensureClientProjectFolder({ orgId, clientId, projectName, createdBy });
  }

  const { getSubfolderForModule } = await import("../lib/uploads/folder-mapper.js");
  const subfolderName = getSubfolderForModule(moduleName);
  return subfolderIds[subfolderName] || subfolderIds["Other"] || null;
}

export async function autoRouteFileInClientFolder(
  fileId: string,
  options: {
    orgId: string;
    clientId: string;
    moduleName: string;
    entityId?: string;
    createdBy: string;
    projectName?: string;
  },
): Promise<void> {
  const { orgId, clientId, moduleName, entityId, createdBy, projectName } = options;

  const targetFolderId = await resolveClientFolder(orgId, clientId, moduleName, createdBy, projectName);
  if (!targetFolderId) return;

  const updateFields: Record<string, unknown> = { folderId: targetFolderId };
  if (entityId && moduleName === "project") updateFields.projectId = entityId;
  if (entityId && moduleName === "task") updateFields.taskId = entityId;

  await FileAttachment.updateOne({ id: fileId }, { $set: updateFields });

  await recordAuditLog({
    orgId, userId: createdBy, createdBy,
    action: "file.routed", entityType: "file", entityId: fileId,
    description: `File auto-routed to ${options.moduleName} folder in client ${clientId}`,
  });

  cacheManager.invalidatePattern(`files:${orgId}`);
}
