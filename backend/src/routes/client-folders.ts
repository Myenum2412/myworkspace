// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { Folder } from "../lib/db/models/Folder.js";
import { verifyOrgAccess } from "../lib/org-utils.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { CLIENT_SUBFOLDERS } from "../lib/uploads/folder-mapper.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "../services/audit.service.js";
import { ensureClientFolders } from "../services/client-folder.service.js";

export default async function plugin(fastify: FastifyInstance) {
fastify.get("/:clientId/tree", async (req: AuthRequest, reply: any) => {
  const { clientId } = req.params;
  const orgId = req.query.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  await verifyOrgAccess(req.user!.userId, orgId);

  const folders = await Folder.find({ orgId, clientId, deletedAt: null })
    .sort({ path: 1 })
    .select("id name path parentId clientId orgId deletedAt createdAt")
    .lean();
  reply.send({ success: true, data: folders });
});

fastify.get("/:clientId/stats", async (req: AuthRequest, reply: any) => {
  const { clientId } = req.params;
  const orgId = req.query.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  await verifyOrgAccess(req.user!.userId, orgId);

  const [folderCount, fileCount, totalSizeAgg] = await Promise.all([
    Folder.countDocuments({ orgId, clientId, deletedAt: null }),
    FileAttachment.countDocuments({ orgId, clientId, deletedAt: null }),
    FileAttachment.aggregate([
      { $match: { orgId, clientId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]),
  ]);

  const totalSize = totalSizeAgg[0]?.total || 0;

  const perFolder = await FileAttachment.aggregate([
    { $match: { orgId, clientId, deletedAt: null } },
    { $group: { _id: "$folderId", count: { $sum: 1 }, size: { $sum: "$size" } } },
  ]);

  reply.send({
    success: true,
    data: { folderCount, fileCount, totalSize, perFolder },
  });
});

fastify.get("/:clientId/subfolders", async (req: AuthRequest, reply: any) => {
  const { clientId } = req.params;
  const orgId = req.query.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  reply.send({ success: true, data: CLIENT_SUBFOLDERS });
});

fastify.get("/:clientId/sync", async (req: AuthRequest, reply: any) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can sync client folders");
  const { clientId } = req.params;
  const orgId = req.body.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  await verifyOrgAccess(req.user!.userId, orgId);

  const { rootFolderId, subfolderIds } = await ensureClientFolders({
    orgId,
    clientId,
    clientName: req.body.clientName || clientId,
    createdBy: req.user!.userId,
  });

  await recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "folder.synced",
    entityType: "client",
    entityId: clientId,
    description: `Client folders synced for ${clientId}`,
  });

  const folders = await Folder.find({ orgId, clientId, deletedAt: null })
    .sort({ path: 1 })
    .select("id name path parentId clientId orgId deletedAt createdAt")
    .lean();

  reply.send({
    success: true,
    data: { rootFolderId, subfolderIds, folders },
  });
});
}
