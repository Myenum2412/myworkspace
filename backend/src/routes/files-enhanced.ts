import { Router, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileVersion } from "../lib/db/models/FileVersion.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { StorageQuota } from "../lib/db/models/StorageQuota.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { getStorageProvider, computeChecksum } from "../lib/storage/providers.js";
import { env } from "../config/env.js";
import { socketIOManager } from "../lib/socketio/index.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.use(authenticate);

async function verifyAccess(userId: string, orgId: string): Promise<void> {
  const member = await OrgMember.findOne({ userId, orgId }).lean();
  if (!member) throw new AppError(403, "Not authorized");
}

async function checkQuota(orgId: string, additionalBytes: number): Promise<void> {
  const quota = await StorageQuota.findOne({ orgId }).lean();
  if (quota && (quota.usedStorageBytes + additionalBytes) > quota.maxStorageBytes) {
    throw new AppError(413, "Organization storage quota exceeded");
  }
}

async function updateUsedStorage(orgId: string, deltaBytes: number): Promise<void> {
  await StorageQuota.updateOne(
    { orgId },
    { $inc: { usedStorageBytes: deltaBytes } },
    { upsert: true }
  );
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const folderId = req.query.folderId as string | undefined;
  const clientId = req.query.clientId as string | undefined;
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
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

  const result = files.map(f => ({
    ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown",
  }));

  res.json({ success: true, data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

// Shared-file listing (org-scoped). Kept from the legacy files router; merged
// here so /api/files has one canonical implementation.
router.get("/shared", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json({ success: true, data: [] }); return; }
  const shares = await FileShare.find({ orgId }).sort({ createdAt: -1 }).lean();

  const fileIds = [...new Set(shares.map(s => s.fileId))];
  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).lean();
  const fileMap = new Map(files.map(f => [f.id, f]));

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

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

// Recycle bin — org-scoped soft-deleted files.
router.get("/recycle-bin", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json({ success: true, data: [] }); return; }
  const files = await FileAttachment.find({ orgId, deletedAt: { $ne: null } })
    .select("id originalName mimeType size createdAt uploaderId deletedAt")
    .sort({ deletedAt: -1 })
    .lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

  const result = files.map(f => ({
    ...f,
    uploaderName: userMap.get(f.uploaderId) || "Unknown",
  }));

  res.json({ success: true, data: result });
});

router.get("/recent", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const files = await FileAttachment.find({ orgId, deletedAt: null })
    .sort({ updatedAt: -1 }).limit(20).lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

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
    StorageQuota.findOne({ orgId }).lean(),
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

// Inline stream/preview of a file (public-object fallback used by the
// download button). Org-membership enforced.
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");
  if (file.deletedAt) throw new AppError(410, "File has been deleted");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: file.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized to access this file");

  const provider = getStorageProvider();
  const buf = await provider.get(file.storagePath);
  if (!buf) throw new AppError(404, "File not found in storage");
  res.set("Content-Type", file.mimeType || "application/octet-stream");
  res.set("Content-Disposition", `inline; filename="${file.originalName}"`);
  res.send(buf);
});

// Share a file with a specific org user (org-scoped).
router.post("/:id/share", async (req: AuthRequest, res: Response) => {
  const { sharedWithUserId, orgId } = req.body;
  if (!orgId) throw new AppError(400, "orgId is required");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId }).lean();
  if (!membership) throw new AppError(403, "Not a member of this organization");

  const shareId = uuid();
  await FileShare.create({
    id: shareId,
    fileId: req.params.id,
    sharedByUserId: req.user!.userId,
    sharedWithUserId: sharedWithUserId || null,
    orgId,
  });
  res.json({ success: true });
});

router.delete("/:id/share", async (req: AuthRequest, res: Response) => {
  const { id } = req.body;
  await FileShare.deleteOne({ id });
  res.json({ success: true });
});

router.post("/upload", upload.array("files", 50), async (req: AuthRequest, res: Response) => {
  const orgId = req.body.orgId as string;
  const folderId = req.body.folderId as string | undefined;
  const clientId = req.body.clientId as string | undefined;
  const description = req.body.description as string || "";
  const tags = req.body.tags ? (typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags) : [];

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!req.files || !(req.files as Express.Multer.File[]).length) throw new AppError(400, "No files provided");

  await verifyAccess(req.user!.userId, orgId);

  const files = req.files as Express.Multer.File[];
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  await checkQuota(orgId, totalSize);

  const provider = getStorageProvider();
  const results: { originalName: string; fileId: string; error?: string }[] = [];

  for (const file of files) {
    try {
      const checksum = await computeChecksum(file.buffer);

      const existingDuplicate = await FileAttachment.findOne({
        orgId, checksum, deletedAt: null,
        $or: [{ folderId: folderId || null }, { folderId: { $exists: false } }],
      }).lean();

      if (existingDuplicate && req.body.skipDuplicates !== "false") {
        results.push({ originalName: file.originalname, fileId: existingDuplicate.id, error: "duplicate_skipped" });
        continue;
      }

      const storagePath = `${orgId}/${Date.now()}-${uuid()}-${file.originalname}`;
      await provider.save(file.buffer, storagePath);

      const fileId = uuid();
      const mimeCategory = file.mimetype.startsWith("image/") ? "image"
        : file.mimetype.startsWith("video/") ? "video"
        : file.mimetype.startsWith("audio/") ? "audio"
        : file.mimetype.includes("pdf") || file.mimetype.includes("document") || file.mimetype.includes("sheet") ? "document"
        : file.mimetype.includes("zip") || file.mimetype.includes("rar") || file.mimetype.includes("tar") ? "archive"
        : "general";

      await FileAttachment.create({
        id: fileId, orgId, folderId: folderId || null, clientId: clientId || null,
        uploaderId: req.user!.userId, name: file.originalname,
        originalName: file.originalname, mimeType: file.mimetype || "application/octet-stream",
        size: file.size, storagePath, storageProvider: env.R2_ENDPOINT ? "r2" : "local",
        category: mimeCategory as any, description, tags, checksum, currentVersion: 1,
      });

      await updateUsedStorage(orgId, file.size);

      await ActivityLog.create({
        orgId, userId: req.user!.userId, action: "file.uploaded",
        entityType: "file", entityId: fileId,
        description: `File "${file.originalname}" uploaded (${(file.size / 1024).toFixed(1)} KB)`,
      });

      socketIOManager.emitToOrg(orgId, "file:uploaded", { fileId, orgId, folderId: folderId || null, clientId: clientId || null });
      results.push({ originalName: file.originalname, fileId });
    } catch (err: any) {
      results.push({ originalName: file.originalname, fileId: "", error: err.message });
    }
  }

  const successCount = results.filter(r => !r.error || r.error === "duplicate_skipped").length;
  res.status(201).json({ success: true, total: files.length, uploaded: successCount, results });
});

router.get("/:id/download", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  await FileAttachment.updateOne({ id: req.params.id }, { lastAccessedAt: new Date() });

  const provider = getStorageProvider();
  const buf = await provider.get(file.storagePath);
  if (!buf) throw new AppError(404, "File not found in storage");

  const isPreview = req.query.preview === "true";
  res.set("Content-Type", file.mimeType || "application/octet-stream");
  res.set("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${file.originalName}"`);
  res.set("Content-Length", String(buf.length));
  res.send(buf);
});

router.get("/:id/versions", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const versions = await FileVersion.find({ fileId: req.params.id }).sort({ versionNumber: -1 }).lean();
  const userIds = [...new Set(versions.map(v => v.uploadedBy))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

  res.json({ success: true, data: versions.map(v => ({ ...v, uploadedByName: userMap.get(v.uploadedBy) || "Unknown" })) });
});

router.post("/:id/versions", upload.single("file"), async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  if (file.isLocked && file.lockedBy !== req.user!.userId) {
    throw new AppError(423, "File is locked by another user");
  }

  if (!req.file) throw new AppError(400, "No file provided");
  const comment = req.body.comment || "";

  const provider = getStorageProvider();
  const versionNumber = (file.currentVersion || 0) + 1;
  const versionStoragePath = `${file.orgId}/versions/${file.id}/v${versionNumber}-${req.file.originalname}`;
  await provider.save(req.file.buffer, versionStoragePath);

  const versionId = uuid();
  await FileVersion.create({
    id: versionId, fileId: file.id, versionNumber, storagePath: versionStoragePath,
    size: req.file.size, uploadedBy: req.user!.userId, comment,
  });

  const checksum = await computeChecksum(req.file.buffer);
  await FileAttachment.updateOne(
    { id: file.id },
    { currentVersion: versionNumber, size: req.file.size, checksum, mimeType: req.file.mimetype || file.mimeType }
  );

  await ActivityLog.create({
    orgId: file.orgId, userId: req.user!.userId, action: "file.version.created",
    entityType: "file", entityId: file.id,
    description: `Version ${versionNumber} uploaded for "${file.originalName}"`,
  });

  res.status(201).json({ success: true, versionId, versionNumber });
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
    { storagePath: version.storagePath, size: version.size, currentVersion: file.currentVersion! + 1 }
  );

  await ActivityLog.create({
    orgId: file.orgId, userId: req.user!.userId, action: "file.rolledback",
    entityType: "file", entityId: file.id,
    description: `File rolled back to version ${version.versionNumber}`,
  });

  res.json({ success: true });
});

router.post("/:id/lock", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  if (file.isLocked && file.lockedBy !== req.user!.userId) {
    throw new AppError(423, "File is locked by another user");
  }

  await FileAttachment.updateOne(
    { id: req.params.id },
    { isLocked: true, lockedBy: req.user!.userId }
  );

  res.json({ success: true, locked: true });
});

router.post("/:id/unlock", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  if (file.lockedBy && file.lockedBy !== req.user!.userId) {
    throw new AppError(423, "File is locked by another user");
  }

  await FileAttachment.updateOne(
    { id: req.params.id },
    { isLocked: false, lockedBy: null }
  );

  res.json({ success: true, locked: false });
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
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (tags !== undefined) update.tags = tags;
  if (folderId !== undefined) update.folderId = folderId || null;

  await FileAttachment.updateOne({ id: req.params.id }, { $set: update });

  await ActivityLog.create({
    orgId: file.orgId, userId: req.user!.userId, action: "file.updated",
    entityType: "file", entityId: file.id,
    description: `File "${file.originalName}" metadata updated`,
  });

  res.json({ success: true });
});

router.post("/:id/duplicate", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const provider = getStorageProvider();
  const buf = await provider.get(file.storagePath);
  if (!buf) throw new AppError(404, "Source file not found in storage");

  const newId = uuid();
  const storagePath = `${file.orgId}/${Date.now()}-${newId}-${file.originalName}`;
  await provider.save(buf, storagePath);

  await FileAttachment.create({
    id: newId, orgId: file.orgId, folderId: file.folderId,
    uploaderId: req.user!.userId, name: `Copy of ${file.name}`,
    originalName: `Copy of ${file.originalName}`, mimeType: file.mimeType,
    size: file.size, storagePath, storageProvider: file.storageProvider,
    category: file.category, description: file.description, tags: file.tags,
    checksum: file.checksum, currentVersion: 1,
  });

  res.status(201).json({ success: true, fileId: newId });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  if (file.isLocked && file.lockedBy !== req.user!.userId) {
    throw new AppError(423, "File is locked by another user");
  }

  await FileAttachment.updateOne(
    { id: req.params.id },
    { deletedAt: new Date(), deletedBy: req.user!.userId }
  );

  await ActivityLog.create({
    orgId: file.orgId, userId: req.user!.userId, action: "file.deleted",
    entityType: "file", entityId: file.id,
    description: `File "${file.originalName}" moved to trash`,
  });

  res.json({ success: true });
});

router.post("/:id/restore", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");
  if (!file.deletedAt) throw new AppError(400, "File is not in trash");
  await verifyAccess(req.user!.userId, file.orgId);

  await FileAttachment.updateOne(
    { id: req.params.id },
    { deletedAt: null, deletedBy: null }
  );

  await ActivityLog.create({
    orgId: file.orgId, userId: req.user!.userId, action: "file.restored",
    entityType: "file", entityId: file.id,
    description: `File "${file.originalName}" restored from trash`,
  });

  res.json({ success: true });
});

router.delete("/:id/permanent", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const provider = getStorageProvider();
  await provider.delete(file.storagePath);

  const versions = await FileVersion.find({ fileId: file.id }).lean();
  for (const v of versions) {
    await provider.delete(v.storagePath);
  }
  await FileVersion.deleteMany({ fileId: file.id });
  await FileShare.deleteMany({ fileId: file.id });
  await ShareLinkDeleteMany(file.id);
  await FileAttachment.deleteOne({ id: req.params.id });

  await updateUsedStorage(file.orgId, -file.size);

  await ActivityLog.create({
    orgId: file.orgId, userId: req.user!.userId, action: "file.permanent_deleted",
    entityType: "file", entityId: file.id,
    description: `File "${file.originalName}" permanently deleted`,
  });

  res.json({ success: true });
});

async function ShareLinkDeleteMany(fileId: string): Promise<void> {
  const { ShareLink } = await import("../lib/db/models/ShareLink.js");
  await ShareLink.deleteMany({ fileId });
}

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
    { deletedAt: now, deletedBy: req.user!.userId }
  );

  await ActivityLog.create({
    orgId: orgIds[0], userId: req.user!.userId, action: "files.bulk_deleted",
    entityType: "file", entityId: fileIds.join(","),
    description: `${fileIds.length} files moved to trash`,
  });

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
    { deletedAt: null, deletedBy: null }
  );

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
    { folderId: targetFolderId || null }
  );

  res.json({ success: true, moved: fileIds.length });
});

router.post("/bulk/tag", async (req: AuthRequest, res: Response) => {
  const { fileIds, tags, action: tagAction } = req.body;
  if (!fileIds?.length || !tags?.length) throw new AppError(400, "fileIds and tags are required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  if (tagAction === "remove") {
    await FileAttachment.updateMany(
      { id: { $in: fileIds } },
      { $pullAll: { tags } }
    );
  } else {
    await FileAttachment.updateMany(
      { id: { $in: fileIds } },
      { $addToSet: { tags: { $each: tags } } }
    );
  }

  res.json({ success: true });
});

router.post("/bulk/permanent", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds } }).lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  const provider = getStorageProvider();
  for (const file of files) {
    await provider.delete(file.storagePath);
    const versions = await FileVersion.find({ fileId: file.id }).lean();
    for (const v of versions) await provider.delete(v.storagePath);
    await FileVersion.deleteMany({ fileId: file.id });
    await FileShare.deleteMany({ fileId: file.id });
    await ShareLinkDeleteMany(file.id);
  }

  await FileAttachment.deleteMany({ id: { $in: fileIds } });
  res.json({ success: true, deleted: fileIds.length });
});

export default router;
