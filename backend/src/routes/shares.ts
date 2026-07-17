import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { hash, compare } from "bcryptjs";
import { ShareLink } from "../lib/db/models/ShareLink.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { recordAuditLog } from "../services/audit.service.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { verifyOrgAccess } from "../lib/org-utils.js";
import crypto from "crypto";
import { cacheManager } from "../lib/cache.js";

const router = Router();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/links", authenticate, async (req: AuthRequest, res: Response) => {
  const { fileId, orgId, isPublic, password, expiresAt, maxDownloads, allowDownload } = req.body;
  if (!fileId || !orgId) throw new AppError(400, "fileId and orgId are required");

  // Enforce workspace isolation: verify file belongs to the same org
  const file = await FileAttachment.findOne({ id: fileId, orgId, deletedAt: null }).select("id orgId originalName").lean();
  if (!file) throw new AppError(404, "File not found");

  await verifyOrgAccess(req.user!.userId, orgId);

  const token = generateToken();
  const hashedPassword = password ? await hash(password, 12) : null;

  await ShareLink.create({
    id: uuid(), fileId, createdBy: req.user!.userId, orgId, token,
    isPublic: isPublic || false, password: hashedPassword,
    expiresAt: expiresAt || null, maxDownloads: maxDownloads || null,
    allowDownload: allowDownload !== false, isActive: true,
  });

  const shareUrl = `${req.protocol}://${req.get("host")}/share/${token}`;

  await recordAuditLog({
    orgId, userId: req.user!.userId, createdBy: req.user!.userId, action: "share.link.created",
    entityType: "file", entityId: fileId,
    description: `Share link created for "${file.originalName}"`,
  });

  res.status(201).json({ success: true, token, shareUrl });
});

router.get("/links/:token", optionalAuth, async (req: AuthRequest, res: Response) => {
  const link = await ShareLink.findOne({ token: req.params.token, isActive: true }).select("fileId password allowDownload expiresAt").lean();
  if (!link) throw new AppError(404, "Share link not found or expired");

  if (link.expiresAt && new Date() > link.expiresAt) {
    await ShareLink.updateOne({ token: req.params.token }, { isActive: false });
    throw new AppError(410, "Share link has expired");
  }

  const file = await FileAttachment.findOne({ id: link.fileId, deletedAt: null }).select("id originalName mimeType size").lean();
  if (!file) throw new AppError(404, "File not found");

  res.json({
    data: {
      fileId: file.id, originalName: file.originalName, mimeType: file.mimeType, size: file.size,
      hasPassword: !!link.password, allowDownload: link.allowDownload,
    },
  });
});

router.post("/links/:token/verify", async (req: AuthRequest, res: Response) => {
  const { password } = req.body;
  const link = await ShareLink.findOne({ token: req.params.token, isActive: true }).select("password").lean();
  if (!link) throw new AppError(404, "Share link not found");

  if (!link.password) return res.json({ verified: true });

  const valid = await compare(password, link.password);
  if (!valid) throw new AppError(401, "Invalid password");

  res.json({ verified: true });
});

router.get("/links/:token/download", async (req: AuthRequest, res: Response) => {
  const link = await ShareLink.findOne({ token: req.params.token, isActive: true }).select("fileId allowDownload maxDownloads downloadCount expiresAt storagePath").lean();
  if (!link) throw new AppError(404, "Share link not found or expired");

  if (link.expiresAt && new Date() > link.expiresAt) {
    await ShareLink.updateOne({ token: req.params.token }, { isActive: false });
    throw new AppError(410, "Share link has expired");
  }

  if (!link.allowDownload) throw new AppError(403, "Download not allowed for this share link");

  if (link.maxDownloads && link.downloadCount >= link.maxDownloads) {
    throw new AppError(429, "Download limit reached for this share link");
  }

  const file = await FileAttachment.findOne({ id: link.fileId, deletedAt: null }).select("id originalName mimeType size storagePath").lean();
  if (!file) throw new AppError(404, "File not found");

  await ShareLink.updateOne({ token: req.params.token }, { $inc: { downloadCount: 1 } });

  const { getStorageProvider } = await import("../lib/storage/providers.js");
  const provider = getStorageProvider();
  const buf = await provider.get(file.storagePath);
  if (!buf) throw new AppError(404, "File not found in storage");

  res.set("Content-Type", file.mimeType || "application/octet-stream");
  res.set("Content-Disposition", `attachment; filename="${file.originalName}"`);
  res.send(buf);
});

router.get("/links", authenticate, async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const fileId = req.query.fileId as string | undefined;
  if (!orgId) throw new AppError(400, "orgId is required");

  await verifyOrgAccess(req.user!.userId, orgId);

  const filter: Record<string, unknown> = { orgId };
  if (fileId) filter.fileId = fileId;

  const links = await ShareLink.find(filter).sort({ createdAt: -1 }).select("id fileId token isPublic allowDownload maxDownloads downloadCount expiresAt isActive createdAt createdBy orgId").lean();
  res.json({ data: links });
});

router.delete("/links/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const link = await ShareLink.findOne({ id: req.params.id }).select("createdBy orgId").lean();
  if (!link) throw new AppError(404, "Share link not found");
  if (link.createdBy !== req.user!.userId) {
    await verifyOrgAccess(req.user!.userId, link.orgId);
  }

  await ShareLink.updateOne({ id: req.params.id }, { isActive: false });
  res.json({ success: true });
});

router.post("/internal", authenticate, async (req: AuthRequest, res: Response) => {
  const { fileId, sharedWithUserId, orgId } = req.body;
  if (!fileId || !orgId) throw new AppError(400, "fileId and orgId are required");

  const file = await FileAttachment.findOne({ id: fileId, deletedAt: null }).select("id orgId originalName").lean();
  if (!file) throw new AppError(404, "File not found");

  await verifyOrgAccess(req.user!.userId, orgId);

  if (sharedWithUserId) {
    try {
      await verifyOrgAccess(sharedWithUserId, orgId);
    } catch {
      throw new AppError(404, "Target user not found in organization");
    }
  }

  const shareId = uuid();
  await FileShare.create({
    id: shareId, fileId, sharedByUserId: req.user!.userId,
    sharedWithUserId: sharedWithUserId || null, orgId, createdBy: req.user!.userId,
  });

  await recordAuditLog({
    orgId, userId: req.user!.userId, createdBy: req.user!.userId, action: "file.shared",
    entityType: "file", entityId: fileId,
    description: `File "${file.originalName}" shared with ${sharedWithUserId || "organization"}`,
  });

  cacheManager.invalidatePattern(`shares:${orgId}`);

  res.status(201).json({ success: true, shareId });
});

router.delete("/internal/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const share = await FileShare.findOne({ id: req.params.id }).select("orgId fileId").lean();
  if (!share) throw new AppError(404, "Share not found");

  await verifyOrgAccess(req.user!.userId, share.orgId);

  await FileShare.deleteOne({ id: req.params.id });

  await recordAuditLog({
    orgId: share.orgId, userId: req.user!.userId, createdBy: req.user!.userId, action: "share.removed",
    entityType: "file", entityId: share.fileId,
    description: "Share removed",
  });

  cacheManager.invalidatePattern(`shares:${share.orgId}`);

  res.json({ success: true });
});

router.get("/internal", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.query.userId as string;
  const orgId = req.query.orgId as string;

  if (orgId) {
    await verifyOrgAccess(req.user!.userId, orgId);
    const shares = await FileShare.find({ orgId }).sort({ createdAt: -1 }).select("id fileId sharedByUserId sharedWithUserId orgId createdAt").lean();
    const fileIds = [...new Set(shares.map(s => s.fileId))];
    const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("id originalName mimeType size").lean();
    const fileMap = new Map(files.map(f => [f.id, f]));

    const result = shares.map(s => ({
      ...s, file: fileMap.get(s.fileId) ? {
        originalName: fileMap.get(s.fileId)!.originalName,
        mimeType: fileMap.get(s.fileId)!.mimeType,
        size: fileMap.get(s.fileId)!.size,
      } : undefined,
    }));

    res.json({ data: result });
    return;
  }

  if (userId) {
    const shares = await FileShare.find({ sharedWithUserId: userId }).sort({ createdAt: -1 }).select("id fileId sharedByUserId sharedWithUserId orgId createdAt").lean();
    const fileIds = [...new Set(shares.map(s => s.fileId))];
    const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("id originalName mimeType size").lean();
    const fileMap = new Map(files.map(f => [f.id, f]));

    const result = shares.map(s => ({
      ...s, file: fileMap.get(s.fileId) ? {
        originalName: fileMap.get(s.fileId)!.originalName,
        mimeType: fileMap.get(s.fileId)!.mimeType,
        size: fileMap.get(s.fileId)!.size,
      } : undefined,
    }));

    res.json({ data: result });
    return;
  }

  throw new AppError(400, "userId or orgId is required");
});

export default router;
