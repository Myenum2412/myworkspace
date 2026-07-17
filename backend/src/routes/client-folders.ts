import { Router, Response } from "express";
import { Folder } from "../lib/db/models/Folder.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { ensureClientFolders } from "../services/client-folder.service.js";
import { recordAuditLog } from "../services/audit.service.js";
import { CLIENT_SUBFOLDERS } from "../lib/uploads/folder-mapper.js";

const router = Router();
router.use(authenticate);

router.get("/:clientId/tree", async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const orgId = req.query.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  const folders = await Folder.find({ orgId, clientId, deletedAt: null }).sort({ path: 1 }).select("id name path parentId clientId orgId deletedAt createdAt").lean();
  res.json({ success: true, data: folders });
});

router.get("/:clientId/stats", async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const orgId = req.query.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

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

  res.json({
    success: true,
    data: { folderCount, fileCount, totalSize, perFolder },
  });
});

router.get("/:clientId/subfolders", async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const orgId = req.query.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  res.json({ success: true, data: CLIENT_SUBFOLDERS });
});

router.post("/:clientId/sync", async (req: AuthRequest, res: Response) => {
  const { clientId } = req.params;
  const orgId = req.body.orgId as string;
  if (!orgId || !clientId) throw new AppError(400, "orgId and clientId are required");

  const { rootFolderId, subfolderIds } = await ensureClientFolders({
    orgId,
    clientId,
    clientName: req.body.clientName || clientId,
    createdBy: req.user!.userId,
  });

  await recordAuditLog({
    orgId, userId: req.user!.userId, createdBy: req.user!.userId,
    action: "folder.synced", entityType: "client", entityId: clientId,
    description: `Client folders synced for ${clientId}`,
  });

  const folders = await Folder.find({ orgId, clientId, deletedAt: null }).sort({ path: 1 }).select("id name path parentId clientId orgId deletedAt createdAt").lean();

  res.json({
    success: true,
    data: { rootFolderId, subfolderIds, folders },
  });
});

export default router;
