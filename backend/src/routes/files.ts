import { Router, Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { saveFile, getFilePath, getFileBuffer, deleteFile as deleteStorageFile } from "../lib/storage/index.js";
import { env } from "../config/env.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

router.use(authenticate);

router.get("/shared", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json([]); return; }
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

  res.json(result);
});

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json([]); return; }
  const files = await FileAttachment.find({ orgId, deletedAt: null })
    .select("id originalName mimeType size createdAt uploaderId")
    .sort({ createdAt: -1 })
    .lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

  const result = files.map(f => ({
    ...f,
    uploaderName: userMap.get(f.uploaderId) || "Unknown",
  }));

  res.json(result);
});

router.get("/recycle-bin", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json([]); return; }
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

  res.json(result);
});

router.post("/", upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "No file provided");
  const orgId = req.body.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");

  const buffer = req.file.buffer;
  const storagePath = await saveFile(buffer, req.file.originalname);

  const fileId = uuid();
  await FileAttachment.create({
    id: fileId,
    orgId,
    uploaderId: req.user!.userId,
    name: req.file.originalname,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype || "application/octet-stream",
    size: req.file.size,
    storagePath,
  });

  await ActivityLog.create({
    orgId,
    userId: req.user!.userId,
    action: "file.uploaded",
    entityType: "file",
    entityId: fileId,
    description: `File "${req.file.originalname}" uploaded`,
  });

  res.status(201).json({ success: true, fileId });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");
  if (file.deletedAt) throw new AppError(410, "File has been deleted");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: file.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized to access this file");

  if (env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    const buf = await getFileBuffer(file.storagePath);
    if (!buf) throw new AppError(404, "File not found in storage");
    res.set("Content-Type", file.mimeType || "application/octet-stream");
    res.set("Content-Disposition", `inline; filename="${file.originalName}"`);
    res.send(buf);
    return;
  }

  const filePath = getFilePath(file.storagePath);
  if (!filePath) throw new AppError(404, "File not found on disk");

  res.download(filePath, file.originalName);
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");
  if (file.uploaderId !== req.user!.userId) throw new AppError(403, "Not authorized to delete this file");
  if (file.deletedAt) throw new AppError(400, "File is already in recycle bin");

  await FileAttachment.updateOne({ id: req.params.id }, { deletedAt: new Date() });

  res.json({ success: true });
});

router.post("/:id/restore", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");
  if (!file.deletedAt) throw new AppError(400, "File is not in recycle bin");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: file.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  await FileAttachment.updateOne({ id: req.params.id }, { deletedAt: null });

  res.json({ success: true });
});

router.delete("/:id/permanent", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id }).lean();
  if (!file) throw new AppError(404, "File not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: file.orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  await deleteStorageFile(file.storagePath);
  await FileAttachment.deleteOne({ id: req.params.id });
  await FileShare.deleteMany({ fileId: req.params.id });

  res.json({ success: true });
});

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

export default router;
