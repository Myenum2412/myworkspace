import { v4 as uuid } from "uuid";
import { ClientSession } from "mongoose";
import { Folder } from "../db/models/Folder.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { ClientAuditLog } from "../db/models/ClientAuditLog.js";
import { ClientWorkspace } from "../db/models/ClientWorkspace.js";
import { CLIENT_SUBFOLDERS, CLIENT_BASE_FOLDER } from "../uploads/folder-mapper.js";

const BASE_PATH = `/${CLIENT_BASE_FOLDER}`;

export async function provisionClientWorkspace(
  orgId: string,
  clientId: string,
  adminId: string,
  clientName: string,
  session: ClientSession
): Promise<void> {
  const folderIds: string[] = [];
  const clientRoot = `${BASE_PATH}/${clientId}`;

  const rootFolderId = uuid();
  await Folder.create(
    [{
      id: rootFolderId,
      orgId,
      clientId,
      parentId: null,
      name: clientName,
      path: clientRoot,
      permissions: { clientCanView: true, clientCanUpload: true, clientCanDelete: false },
      createdBy: adminId,
    }],
    { session }
  );
  folderIds.push(rootFolderId);

  for (const subName of CLIENT_SUBFOLDERS) {
    const folderId = uuid();
    await Folder.create(
      [{
        id: folderId,
        orgId,
        clientId,
        parentId: rootFolderId,
        name: subName,
        path: `${clientRoot}/${subName}`,
        permissions: {
          clientCanView: true,
          clientCanUpload: subName !== "Reports",
          clientCanDelete: false,
        },
        createdBy: adminId,
      }],
      { session }
    );
    folderIds.push(folderId);
  }

  await ClientWorkspace.create(
    [
      {
        id: uuid(),
        orgId,
        clientId,
        dashboardEnabled: true,
        fileManagementEnabled: true,
        modules: ["dashboard", "files", "projects", "reports", "settings"],
        defaultFolderIds: folderIds,
        permissions: {
          clientCanViewDashboard: true,
          clientCanViewFiles: true,
          clientCanUploadFiles: true,
          clientCanDeleteFiles: false,
        },
        createdBy: adminId,
      },
    ],
    { session }
  );

  const documentsFolderId = folderIds.find((_, i) => CLIENT_SUBFOLDERS[i - 1] === "Documents") || folderIds[1];

  await FileAttachment.create(
    [
      {
        id: uuid(),
        orgId,
        clientId,
        folderId: documentsFolderId,
        uploaderId: adminId,
        createdBy: adminId,
        name: "Welcome.txt",
        originalName: "Welcome.txt",
        mimeType: "text/plain",
        size: 0,
        storagePath: "/welcome.txt",
        storageProvider: "local",
        category: "general",
        description: "Welcome to your client workspace",
        tags: ["welcome"],
        isLocked: false,
        lockedBy: null,
        currentVersion: 1,
        checksum: "",
        isDuplicate: false,
        duplicateOf: null,
        lastAccessedAt: null,
        deletedAt: null,
        deletedBy: null,
      },
    ],
    { session }
  );

  await ClientAuditLog.create(
    [
      {
        orgId,
        clientId,
        clientUserId: null,
        createdBy: adminId,
        action: "workspace.provisioned",
        entityType: "client",
        entityId: clientId,
        description: `Workspace provisioned for client ${clientName}: ${CLIENT_SUBFOLDERS.length + 1} folders created`,
      },
    ],
    { session }
  );
}
