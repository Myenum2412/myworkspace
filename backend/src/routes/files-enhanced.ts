import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import multer from "multer";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileVersion } from "../lib/db/models/FileVersion.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { verifyOrgAccess } from "../lib/org-utils.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { recordAuditLog } from "../services/audit.service.js";
import { cacheManager, CacheKeys } from "../lib/cache.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import {
  uploadFile, softDeleteFile, restoreFile, permanentDeleteFile,
  createFileVersion, toggleFileLock, getFileStream, duplicateFile,
} from "../services/file.service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(authenticate);

async function verifyAccess(userId: string, orgId: string): Promise<void> {
  await verifyOrgAccess(userId, orgId);
}

function invalidateFileCaches(orgId: string): void {
  cacheManager.invalidatePattern(`files:${orgId}`);
  cacheManager.invalidatePattern(`recycle:${orgId}`);
  cacheManager.invalidatePattern(CacheKeys.dashboardMetrics(orgId));
}

router.get("/", cacheEnhanced({ ttl: 30, varyByOrg: true, varyByQuery: true, tags: ["files"] }), async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const folderId = req.query.folderId as string | undefined;
  const clientId = req.query.clientId as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  const category = req.query.category as string | undefined;
  const mimeType = req.query.mimeType as string | undefined;
  const uploaderId = req.query.uploaderId as string | undefined;
  const search = req.query.search as string | undefined;
  const sort = (req.query.sort as string) || "-createdAt";
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const filter: Record<string, unknown> = { orgId, deletedAt: null };
  if (folderId !== undefined) filter.folderId = folderId || null;
  if (clientId) filter.clientId = clientId;
  if (projectId) filter.projectId = projectId;
  if (category) filter.category = category;
  if (mimeType) filter.mimeType = { $regex: mimeType.replace("*", ".*"), $options: "i" };
  if (uploaderId) filter.uploaderId = uploaderId;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { originalName: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { tags: { $regex: search, $options: "i" } },
    ];
  }

  const sortObj: Record<string, 1 | -1> = {};
  if (sort.startsWith("-")) sortObj[sort.slice(1)] = -1;
  else sortObj[sort] = 1;

  const [files, total] = await Promise.all([
    FileAttachment.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    FileAttachment.countDocuments(filter),
  ]);

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  const result = files.map(f => ({
    ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown",
  }));

  res.json({ success: true, data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.get("/shared", cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["file-shares"] }), async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json({ success: true, data: [] }); return; }
  await verifyAccess(req.user!.userId, orgId);
  const shares = await FileShare.find({ orgId }).sort({ createdAt: -1 }).lean();

  const fileIds = [...new Set(shares.map(s => s.fileId))];
  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).lean();
  const fileMap = new Map(files.map(f => [f.id, f]));

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  const result = shares.map(share => {
    const file = fileMap.get(share.fileId);
    return {
      ...share,
      file: file ? { originalName: file.originalName, mimeType: file.mimeType, size: file.size } : undefined,
      uploaderName: file ? userMap.get(file.uploaderId) || "Unknown" : "Unknown",
    };
  });

  res.json({ success: true, data: result });
});

router.get("/recycle-bin", cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["files"] }), async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json({ success: true, data: [] }); return; }
  await verifyAccess(req.user!.userId, orgId);
  const files = await FileAttachment.find({ orgId, deletedAt: { $ne: null } })
    .select("id originalName mimeType size createdAt uploaderId deletedAt")
    .sort({ deletedAt: -1 })
    .lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  res.json({ success: true, data: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })) });
});

router.get("/recent", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const files = await FileAttachment.find({ orgId, deletedAt: null })
    .sort({ updatedAt: -1 }).limit(20).lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  res.json({ success: true, data: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })) });
});

router.get("/stats", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const [totalFiles, totalSize, deletedFiles, quota] = await Promise.all([
    FileAttachment.countDocuments({ orgId, deletedAt: null }),
    FileAttachment.aggregate([
      { $match: { orgId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]),
    FileAttachment.countDocuments({ orgId, deletedAt: { $ne: null } }),
    (await import("../lib/db/models/StorageQuota.js")).StorageQuota.findOne({ orgId }).lean(),
  ]);

  const mimeTypeBreakdown = await FileAttachment.aggregate([
    { $match: { orgId, deletedAt: null } },
    { $group: { _id: { $arrayElemAt: [{ $split: ["$mimeType", "/"] }, 0] }, count: { $sum: 1 }, size: { $sum: "$size" } } },
  ]);

  res.json({
    success: true,
    data: {
      totalFiles,
      totalSize: totalSize[0]?.total || 0,
      usedStorage: quota?.usedStorageBytes || 0,
      maxStorage: quota?.maxStorageBytes || 10 * 1024 * 1024 * 1024,
      deletedFiles,
      mimeTypeBreakdown,
    },
  });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const result = await getFileStream(req.params.id);
  if (!result) throw new AppError(404, "File not found");
  res.set("Content-Type", result.mimeType);
  res.set("Content-Disposition", `inline; filename="${result.originalName}"`);
  res.send(result.buffer);
});

router.get("/:id/download", async (req: AuthRequest, res: Response) => {
  const result = await getFileStream(req.params.id);
  if (!result) throw new AppError(404, "File not found");

  const isPreview = req.query.preview === "true";
  res.set("Content-Type", result.mimeType);
  res.set("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${result.originalName}"`);
  res.set("Content-Length", String(result.size));
  res.send(result.buffer);
});

router.get("/:id/versions", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const versions = await FileVersion.find({ fileId: req.params.id }).sort({ versionNumber: -1 }).lean();
  const userIds = [...new Set(versions.map(v => v.uploadedBy))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  res.json({ success: true, data: versions.map(v => ({ ...v, uploadedByName: userMap.get(v.uploadedBy) || "Unknown" })) });
});

router.post("/:id/versions", upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "No file provided");
  const result = await createFileVersion(req.params.id, req.user!.userId, req.file.buffer, req.file.originalname, req.body.comment);
  res.status(201).json({ success: true, ...result });
});

router.post("/:id/rollback", async (req: AuthRequest, res: Response) => {
  const { versionId } = req.body;
  if (!versionId) throw new AppError(400, "versionId is required");

  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const version = await FileVersion.findOne({ id: versionId, fileId: file.id }).lean();
  if (!version) throw new AppError(404, "Version not found");

  await FileAttachment.updateOne(
    { id: file.id },
    { storagePath: version.storagePath, size: version.size, currentVersion: file.currentVersion! + 1 },
  );

  await recordAuditLog({
    orgId: file.orgId, userId: req.user!.userId, createdBy: req.user!.userId,
    action: "file.rolledback", entityType: "file", entityId: file.id,
    description: `File rolled back to version ${version.versionNumber}`,
  });

  socketIOManager.emitToOrg(file.orgId, "file:updated", { fileId: file.id, action: "rolled_back", versionNumber: version.versionNumber });
  invalidateFileCaches(file.orgId);

  res.json({ success: true });
});

router.post("/:id/lock", async (req: AuthRequest, res: Response) => {
  const locked = await toggleFileLock(req.params.id, req.user!.userId, true);
  res.json({ success: true, locked });
});

router.post("/:id/unlock", async (req: AuthRequest, res: Response) => {
  const locked = await toggleFileLock(req.params.id, req.user!.userId, false);
  res.json({ success: true, locked: false });
});

router.post("/:id/share", async (req: AuthRequest, res: Response) => {
  const { sharedWithUserId, orgId } = req.body;
  if (!orgId) throw new AppError(400, "orgId is required");

  await verifyOrgAccess(req.user!.userId, orgId);

  const shareId = uuid();
  await FileShare.create({
    id: shareId,
    fileId: req.params.id,
    sharedByUserId: req.user!.userId,
    sharedWithUserId: sharedWithUserId || null,
    orgId,
    createdBy: req.user!.userId,
  });
  res.json({ success: true });
});

router.delete("/:id/share", async (req: AuthRequest, res: Response) => {
  const { id } = req.body;
  if (!id) throw new AppError(400, "share id is required");
  const share = await FileShare.findOne({ id }).lean();
  if (!share) throw new AppError(404, "Share not found");
  await verifyOrgAccess(req.user!.userId, share.orgId);
  await FileShare.deleteOne({ id });
  res.json({ success: true });
});

router.post("/upload", upload.array("files", 50), async (req: AuthRequest, res: Response) => {
  const orgId = req.body.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  if (!req.files || !(req.files as Express.Multer.File[]).length) throw new AppError(400, "No files provided");

  await verifyAccess(req.user!.userId, orgId);

  const files = req.files as Express.Multer.File[];
  const results: { originalName: string; fileId: string; error?: string }[] = [];

  for (const file of files) {
    try {
      const result = await uploadFile({
        orgId,
        folderId: req.body.folderId as string | undefined,
        taskId: req.body.taskId as string | undefined,
        clientId: req.body.clientId as string | undefined,
        uploaderId: req.user!.userId,
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size,
        buffer: file.buffer,
        description: req.body.description as string || "",
        tags: req.body.tags ? (typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags) : [],
        skipDuplicates: req.body.skipDuplicates !== "false",
      });

      if (result.kind === "duplicate") {
        results.push({ originalName: file.originalname, fileId: result.fileId, error: "duplicate_skipped" });
      } else {
        results.push({ originalName: file.originalname, fileId: result.fileId });
      }
    } catch (err: any) {
      results.push({ originalName: file.originalname, fileId: "", error: err.message });
    }
  }

  const successCount = results.filter(r => !r.error || r.error === "duplicate_skipped").length;
  res.status(201).json({ success: true, total: files.length, uploaded: successCount, results });
});

router.post("/:id/duplicate", async (req: AuthRequest, res: Response) => {
  const newId = await duplicateFile(req.params.id, req.user!.userId);
  res.status(201).json({ success: true, fileId: newId });
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const { name, description, tags, folderId } = req.body;

  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  if (file.isLocked && file.lockedBy !== req.user!.userId) {
    throw new AppError(423, "File is locked");
  }

  const update: Record<string, any> = {};
  if (name !== undefined) { update.name = name; update.originalName = name; }
  if (description !== undefined) update.description = description;
  if (tags !== undefined) update.tags = tags;
  if (folderId !== undefined) update.folderId = folderId || null;
  update.updatedBy = req.user!.userId;

  await FileAttachment.updateOne({ id: req.params.id }, { $set: update });

  await recordAuditLog({
    orgId: file.orgId, userId: req.user!.userId, createdBy: req.user!.userId,
    action: "file.updated", entityType: "file", entityId: file.id,
    description: `File "${file.originalName}" metadata updated`,
  });

  socketIOManager.emitToOrg(file.orgId, "file:updated", { fileId: file.id, action: "metadata_updated", updates: Object.keys(update) });
  invalidateFileCaches(file.orgId);

  res.json({ success: true });
});

router.post("/bulk/delete", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).lean();
  const orgIds = [...new Set(files.map(f => f.orgId))];
  if (orgIds.length !== 1) throw new AppError(400, "All files must be in the same organization");
  await verifyAccess(req.user!.userId, orgIds[0]);

  const now = new Date();
  await FileAttachment.updateMany(
    { id: { $in: fileIds }, deletedAt: null },
    { deletedAt: now, deletedBy: req.user!.userId },
  );

  await recordAuditLog({
    orgId: orgIds[0], userId: req.user!.userId, createdBy: req.user!.userId,
    action: "files.bulk_deleted", entityType: "file", entityId: fileIds.join(","),
    description: `${fileIds.length} files moved to trash`,
  });

  socketIOManager.emitToOrg(orgIds[0], "file:deleted", { fileIds, action: "bulk_soft_delete" });
  invalidateFileCaches(orgIds[0]);

  res.json({ success: true, deleted: fileIds.length });
});

router.post("/bulk/restore", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: { $ne: null } }).lean();
  if (!files.length) throw new AppError(404, "No files found in trash");
  await verifyAccess(req.user!.userId, files[0].orgId);

  await FileAttachment.updateMany(
    { id: { $in: fileIds }, deletedAt: { $ne: null } },
    { deletedAt: null, deletedBy: null },
  );

  socketIOManager.emitToOrg(files[0].orgId, "file:updated", { fileIds, action: "bulk_restored" });
  invalidateFileCaches(files[0].orgId);

  res.json({ success: true, restored: fileIds.length });
});

router.post("/bulk/move", async (req: AuthRequest, res: Response) => {
  const { fileIds, targetFolderId } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  await FileAttachment.updateMany(
    { id: { $in: fileIds }, deletedAt: null },
    { folderId: targetFolderId || null },
  );

  socketIOManager.emitToOrg(files[0].orgId, "file:updated", { fileIds, action: "bulk_moved", targetFolderId });
  invalidateFileCaches(files[0].orgId);

  res.json({ success: true, moved: fileIds.length });
});

router.post("/bulk/tag", async (req: AuthRequest, res: Response) => {
  const { fileIds, tags, action: tagAction } = req.body;
  if (!fileIds?.length || !tags?.length) throw new AppError(400, "fileIds and tags are required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  if (tagAction === "remove") {
    await FileAttachment.updateMany({ id: { $in: fileIds } }, { $pullAll: { tags } });
  } else {
    await FileAttachment.updateMany({ id: { $in: fileIds } }, { $addToSet: { tags: { $each: tags } } });
  }

  socketIOManager.emitToOrg(files[0].orgId, "file:updated", { fileIds, action: "bulk_tagged" });
  invalidateFileCaches(files[0].orgId);

  res.json({ success: true });
});

router.post("/bulk/permanent", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds } }).lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  const provider = (await import("../lib/storage/providers.js")).getStorageProvider();
  let totalSizeFreed = 0;
  for (const file of files) {
    try { await provider.delete(file.storagePath); } catch { /* skip */ }
    const versions = await FileVersion.find({ fileId: file.id }).lean();
    for (const v of versions) {
      try { await provider.delete(v.storagePath); } catch { /* skip */ }
    }
    await FileVersion.deleteMany({ fileId: file.id });
    await FileShare.deleteMany({ fileId: file.id });
    await (await import("../lib/db/models/ShareLink.js")).ShareLink.deleteMany({ fileId: file.id });
    totalSizeFreed += file.size;
  }

  await FileAttachment.deleteMany({ id: { $in: fileIds } });
  await (await import("../lib/db/models/StorageQuota.js")).StorageQuota.updateOne(
    { orgId: files[0].orgId },
    { $inc: { usedStorageBytes: -totalSizeFreed } },
  );

  await recordAuditLog({
    orgId: files[0].orgId, userId: req.user!.userId, createdBy: req.user!.userId,
    action: "files.bulk_permanent_deleted", entityType: "file", entityId: fileIds.join(","),
    description: `${fileIds.length} files permanently deleted`,
  });

  socketIOManager.emitToOrg(files[0].orgId, "file:deleted", { fileIds, action: "bulk_permanent_delete" });
  invalidateFileCaches(files[0].orgId);

  res.json({ success: true, deleted: fileIds.length });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  await softDeleteFile(req.params.id, req.user!.userId);
  res.json({ success: true });
});

router.post("/:id/restore", async (req: AuthRequest, res: Response) => {
  await restoreFile(req.params.id, req.user!.userId);
  res.json({ success: true });
});

router.delete("/:id/permanent", async (req: AuthRequest, res: Response) => {
  await permanentDeleteFile(req.params.id, req.user!.userId);
  res.json({ success: true });
});

export default router;
