import { v4 as uuid } from "uuid";
import { ClientSession } from "mongoose";
import { Folder } from "../db/models/Folder.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { ClientAuditLog } from "../db/models/ClientAuditLog.js";
import { ClientWorkspace } from "../db/models/ClientWorkspace.js";

const DEFAULT_FOLDERS = [
  { name: "Documents", path: "/Documents" },
  { name: "Reports", path: "/Reports" },
  { name: "Projects", path: "/Projects" },
  { name: "Settings", path: "/Settings" },
];

export async function provisionClientWorkspace(
  orgId: string,
  clientId: string,
  adminId: string,
  clientName: string,
  session: ClientSession
): Promise<void> {
  const folderIds: string[] = [];

  for (const def of DEFAULT_FOLDERS) {
    const folderId = uuid();
    await Folder.create(
      [
        {
          id: folderId,
          orgId,
          clientId,
          parentId: null,
          name: def.name,
          path: `/clients/${clientId}${def.path}`,
          permissions: {
            clientCanView: true,
            clientCanUpload: def.name !== "Reports",
            clientCanDelete: false,
          },
          createdBy: adminId,
        },
      ],
      { session }
    );
    folderIds.push(folderId);
  }

  const documentsFolderId = folderIds[0];

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
        description: `Workspace provisioned for client ${clientName}: ${DEFAULT_FOLDERS.length} folders created`,
      },
    ],
    { session }
  );
}
