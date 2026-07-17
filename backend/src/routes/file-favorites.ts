import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { Favorite } from "../lib/db/models/Favorite.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { verifyOrgAccess } from "../lib/org-utils.js";
import { recordAuditLog } from "../services/audit.service.js";
import { cacheManager } from "../lib/cache.js";

const router = Router();
router.use(authenticate);

router.post("/:id/favorite", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("id orgId originalName").lean();
  if (!file) throw new AppError(404, "File not found");

  const userId = req.user!.userId;
  const existing = await Favorite.findOne({ userId, fileId: req.params.id }).select("_id").lean();

  if (existing) {
    await Favorite.deleteOne({ _id: (existing as any)._id });
    await recordAuditLog({
      orgId: file.orgId, userId, createdBy: userId,
      action: "file.unfavorited", entityType: "file", entityId: file.id,
      description: `Removed "${file.originalName}" from favorites`,
    });
    res.json({ success: true, isFavorite: false });
  } else {
    await Favorite.create({
      id: uuid(), userId, fileId: req.params.id, orgId: file.orgId,
    });
    await recordAuditLog({
      orgId: file.orgId, userId, createdBy: userId,
      action: "file.favorited", entityType: "file", entityId: file.id,
      description: `Added "${file.originalName}" to favorites`,
    });
    res.json({ success: true, isFavorite: true });
  }
});

router.get("/favorites", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.query.orgId as string;

  const favs = orgId
    ? await Favorite.find({ userId, orgId }).select("fileId folderId").lean()
    : await Favorite.find({ userId }).select("fileId folderId").lean();

  if (!favs.length) {
    res.json({ success: true, data: [] });
    return;
  }

  const fileIds = favs.map((f) => f.fileId).filter(Boolean);
  const folderIds = favs.map((f) => f.folderId).filter(Boolean);

  const [files, folders] = await Promise.all([
    fileIds.length > 0
      ? FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("id originalName mimeType size createdAt uploaderId").lean()
      : [],
    folderIds.length > 0
      ? (await import("../lib/db/models/Folder.js")).Folder.find({ id: { $in: folderIds }, deletedAt: null }).select("id name createdAt").lean()
      : [],
  ]);

  const { User } = await import("../lib/db/models/User.js");
  const userIds = [...new Set(files.map((f: any) => f.uploaderId))];
  const users = await User.find({ id: { $in: userIds } }).select("id name").lean();
  const userMap = new Map(users.map((u: any) => [u.id || u._id.toString(), u.name]));

  const result = [
    ...files.map((f: any) => ({
      id: f.id, type: "file", name: f.originalName, mimeType: f.mimeType,
      size: f.size, createdAt: f.createdAt, uploaderName: userMap.get(f.uploaderId) || "Unknown",
    })),
    ...folders.map((f: any) => ({
      id: f.id, type: "folder", name: f.name, createdAt: f.createdAt,
    })),
  ];

  res.json({ success: true, data: result });
});

export default router;
