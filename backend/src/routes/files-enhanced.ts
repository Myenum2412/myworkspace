import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import multer from "multer";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileVersion } from "../lib/db/models/FileVersion.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { verifyOrgAccess, requireOrgMembership } from "../lib/org-utils.js";
import { recordAuditLog } from "../services/audit.service.js";
import { cacheManager, CacheKeys } from "../lib/cache.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import {
  uploadFile, softDeleteFile, restoreFile, permanentDeleteFile,
  createFileVersion, toggleFileLock, getFileStream, duplicateFile,
  getThumbnailStream,
} from "../services/file.service.js";
import { getThumbnail } from "../services/thumbnail.service.js";
import { getFileMetadata } from "../services/metadata.service.js";
import { generatePreview } from "../services/preview.service.js";
import { streamFile, getFileInfo, handleConditionalRequest } from "../services/streaming.service.js";
import { getConvertedFile } from "../services/conversion.service.js";
import { runFullCleanup } from "../services/cleanup.service.js";
import { getStorageProvider } from "../lib/storage/providers.js";
import { SignedUrlService } from "../lib/storage/signed-urls.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml",
  "image/bmp", "image/tiff", "image/x-icon", "image/heic", "image/heif", "image/x-canon-cr2",
  "image/x-nikon-nef", "image/x-sony-arw", "image/x-adobe-dng", "image/x-olympus-orf",
  "image/x-fuji-raf",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/markdown", "text/html", "text/css", "text/javascript",
  "text/x-scss", "text/x-typescript", "text/x-java", "text/x-python", "text/x-go",
  "text/x-rust", "text/x-c", "text/x-cpp", "text/x-csharp", "text/x-php", "text/x-yaml",
  "text/xml", "application/json", "application/xml", "application/x-yaml",
  "application/zip", "application/x-rar-compressed", "application/x-7z-compressed",
  "application/x-tar", "application/gzip", "application/x-bzip2",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska",
  "video/x-ms-wmv", "video/x-flv", "video/mpeg", "video/3gpp", "video/ogg", "video/mp2t",
  "video/x-m2ts", "video/dv",
  "audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/x-m4a",
  "audio/x-ms-wma", "audio/x-aiff", "audio/opus",
  "model/gltf+json", "model/gltf-binary", "model/stl", "model/obj", "model/vnd.fbx",
  "model/ply",
  "image/vnd.dwg", "image/vnd.dxf", "application/x-step", "application/x-iges",
  "image/vnd.adobe.photoshop", "application/postscript", "application/x-figma",
  "application/x-sketch",
  "application/octet-stream",
]);

const MIME_PREFIXES = [
  "image/", "video/", "audio/", "text/", "model/",
  "application/",
];

function isAllowedMimeType(mimeType: string): boolean {
  if (ALLOWED_MIME_TYPES.has(mimeType)) return true;
  return MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg", ".bmp", ".tiff", ".tif", ".ico",
  ".heic", ".heif", ".cr2", ".nef", ".arw", ".dng", ".orf", ".raf",
  ".pdf",
  ".doc", ".docx", ".dot", ".xls", ".xlsx", ".csv", ".ppt", ".pptx",
  ".txt", ".md", ".json", ".xml", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".env", ".log", ".sql",
  ".js", ".ts", ".jsx", ".tsx", ".html", ".css", ".scss", ".sass", ".less",
  ".php", ".java", ".py", ".go", ".rs", ".c", ".cpp", ".h", ".cs", ".sh", ".bat", ".ps1",
  ".zip", ".rar", ".7z", ".tar", ".gz", ".bz2",
  ".mp4", ".webm", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".m4v", ".mpeg", ".mpg",
  ".3gp", ".ogv", ".ts", ".mts", ".vob",
  ".mp3", ".wav", ".ogg", ".aac", ".flac", ".m4a", ".wma", ".aiff", ".opus",
  ".glb", ".gltf", ".obj", ".fbx", ".stl", ".ply",
  ".dwg", ".dxf", ".ifc", ".dgn", ".stp", ".step", ".igs", ".iges",
  ".psd", ".ai", ".xd", ".fig", ".sketch",
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
]);

function isAllowedExtension(ext: string): boolean {
  return ALLOWED_EXTENSIONS.has(ext);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = "." + file.originalname.split(".").pop()?.toLowerCase();
    if (isAllowedMimeType(file.mimetype) || isAllowedExtension(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
    }
  },
});

function collectedUploadFiles(req: AuthRequest): Express.Multer.File[] {
  const raw = req.files;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const byField = raw as { [fieldname: string]: Express.Multer.File[] };
  return [...(byField.files || []), ...(byField.file || [])];
}

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
  const start = Date.now();
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
    FileAttachment.find(filter).sort(sortObj).skip(skip).limit(limit).select("id orgId folderId clientId projectId name originalName mimeType size category uploaderId description tags isLocked lockedBy approvalStatus createdAt updatedAt deletedAt").lean(),
    FileAttachment.countDocuments(filter),
  ]);

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).select("id name").lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  const result = files.map(f => ({
    ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown",
  }));

  console.log(`[PERF] GET /files took ${Date.now() - start}ms`);
  res.json({ success: true, data: result, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.get("/shared", cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["file-shares"] }), async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || "";
  if (!orgId) { res.json({ success: true, data: [] }); return; }
  await verifyAccess(req.user!.userId, orgId);
  const shares = await FileShare.find({ orgId }).sort({ createdAt: -1 }).limit(200).select("id fileId sharedByUserId sharedWithUserId orgId createdAt").lean();

  const fileIds = [...new Set(shares.map(s => s.fileId))];
  const { User } = await import("../lib/db/models/User.js");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("id originalName mimeType size uploaderId").lean();
  const fileMap = new Map(files.map(f => [f.id, f]));

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const users = await User.find({ id: { $in: userIds } }).select("id name").lean();
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
    .limit(200)
    .lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).select("id name").lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  res.json({ success: true, data: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })) });
});

router.get("/recent", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const files = await FileAttachment.find({ orgId, deletedAt: null })
    .sort({ updatedAt: -1 }).limit(20).select("id orgId name originalName mimeType size uploaderId category createdAt updatedAt").lean();

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).select("id name").lean();
  const userMap = new Map(users.map(u => [u.id || u._id.toString(), u.name]));

  res.json({ success: true, data: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })) });
});

router.get("/stats", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const userId = req.user!.userId;
  const [totalFiles, totalSize, deletedFiles, quota, userStorage] = await Promise.all([
    FileAttachment.countDocuments({ orgId, deletedAt: null }),
    FileAttachment.aggregate([
      { $match: { orgId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]),
    FileAttachment.countDocuments({ orgId, deletedAt: { $ne: null } }),
    (await import("../lib/db/models/StorageQuota.js")).StorageQuota.findOne({ orgId }).select("usedStorageBytes maxStorageBytes").lean(),
    FileAttachment.aggregate([
      { $match: { orgId, uploaderId: userId, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$size" } } },
    ]),
  ]);

  const mimeTypeBreakdown = await FileAttachment.aggregate([
    { $match: { orgId, deletedAt: null } },
    { $group: { _id: { $arrayElemAt: [{ $split: ["$mimeType", "/"] }, 0] }, count: { $sum: 1 }, size: { $sum: "$size" } } },
  ]);

  const userUsedStorage = userStorage[0]?.total || 0;
  const userStorageLimit = 1024 * 1024 * 1024; // 1 GB per user

  res.json({
    success: true,
    data: {
      totalFiles,
      totalSize: totalSize[0]?.total || 0,
      usedStorage: quota?.usedStorageBytes || 0,
      maxStorage: quota?.maxStorageBytes || 10 * 1024 * 1024 * 1024,
      deletedFiles,
      mimeTypeBreakdown,
      userStorage: {
        used: userUsedStorage,
        limit: userStorageLimit,
      },
    },
  });
});

router.get("/storage-stats", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  await verifyAccess(req.user!.userId, orgId);

  const userId = req.user!.userId;
  const USER_STORAGE_LIMIT = 1024 * 1024 * 1024;

  const [userFiles, allUserFiles, fileTypeBreakdown, extensionBreakdown, largestFile, recentUploads, monthlyStats] = await Promise.all([
    FileAttachment.find({ orgId, uploaderId: userId, deletedAt: null }).sort({ size: -1 }).select("id orgId name originalName mimeType size category uploaderId createdAt").lean(),
    FileAttachment.aggregate([
      { $match: { orgId, uploaderId: userId, deletedAt: { $ne: null } } },
      { $group: { _id: null, count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
    ]),
    FileAttachment.aggregate([
      { $match: { orgId, uploaderId: userId, deletedAt: null } },
      { $group: { _id: "$category", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      { $sort: { totalSize: -1 } },
    ]),
    FileAttachment.aggregate([
      { $match: { orgId, uploaderId: userId, deletedAt: null } },
      { $addFields: { ext: { $toLower: { $ifNull: [{ $last: { $split: ["$originalName", "."] } }, "unknown"] } } } },
      { $group: { _id: "$ext", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    FileAttachment.findOne({ orgId, uploaderId: userId, deletedAt: null })
      .sort({ size: -1 }).select({ name: 1, size: 1, mimeType: 1, createdAt: 1 }).lean(),
    FileAttachment.find({ orgId, uploaderId: userId, deletedAt: null })
      .sort({ createdAt: -1 }).limit(10)
      .select({ id: 1, name: 1, size: 1, mimeType: 1, category: 1, createdAt: 1 }).lean(),
    FileAttachment.aggregate([
      { $match: { orgId, uploaderId: userId, createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const usedStorage = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const availableStorage = Math.max(0, USER_STORAGE_LIMIT - usedStorage);
  const usagePercent = Math.min(100, (usedStorage / USER_STORAGE_LIMIT) * 100);
  const totalFiles = userFiles.length;
  const deletedFiles = allUserFiles[0]?.count || 0;
  const deletedStorage = allUserFiles[0]?.totalSize || 0;
  const averageFileSize = totalFiles > 0 ? Math.round(usedStorage / totalFiles) : 0;
  const lastUpload = userFiles.length > 0 ? userFiles[0].createdAt : null;

  const categoryLabels: Record<string, string> = {
    image: "Images", video: "Videos", audio: "Audio",
    document: "Documents", archive: "Archives", general: "Others",
  };
  const fileTypes = fileTypeBreakdown.map((ft) => ({
    category: ft._id || "general",
    label: categoryLabels[ft._id] || "Others",
    count: ft.count,
    size: ft.totalSize,
    percent: usedStorage > 0 ? Math.round((ft.totalSize / usedStorage) * 100) : 0,
  }));
  const extensionStats = extensionBreakdown.map((e) => ({
    ext: e._id,
    count: e.count,
  }));

  res.json({
    success: true,
    data: {
      usedStorage, totalStorage: USER_STORAGE_LIMIT, availableStorage,
      usagePercent: Math.round(usagePercent * 10) / 10,
      totalFiles, deletedFiles, deletedStorage, averageFileSize,
      largestFile: largestFile ? {
        name: largestFile.name, size: largestFile.size,
        mimeType: largestFile.mimeType, uploadedAt: largestFile.createdAt,
      } : null,
      lastUpload,
      fileTypes,
      extensionStats,
      recentUploads: recentUploads.map((f) => ({
        id: f.id, name: f.name, size: f.size, mimeType: f.mimeType,
        category: f.category, uploadedAt: f.createdAt,
      })),
      monthlyStats: monthlyStats.map((m) => ({ month: m._id, count: m.count, size: m.totalSize })),
    },
  });
});

// ─── Preview API (must precede /:id catch-all) ──────────────────────────

router.get("/preview/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId mimeType").lean();
  if (!file) return void res.status(404).json({ error: "File not found" });
  await verifyAccess(req.user!.userId, file.orgId);

  const result = await generatePreview(req.params.id);
  if (result.url) {
    res.json({ success: true, data: result });
  } else {
    res.status(404).json({ error: "Preview not available" });
  }
});

router.get("/thumbnail/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) return void res.status(404).json({ error: "File not found" });
  await verifyAccess(req.user!.userId, file.orgId);

  const size = (req.query.size as string) || "medium";
  const validSizes = ["small", "medium", "large"];
  const thumbSize = validSizes.includes(size) ? size as any : "medium";

  const result = await getThumbnail(req.params.id, thumbSize);
  if (!result) return void res.status(404).json({ error: "Thumbnail not available" });

  res.set("Content-Type", result.mimeType);
  res.set("Cache-Control", "public, max-age=86400");
  res.set("ETag", `"${req.params.id}-${thumbSize}"`);
  res.send(result.buffer);
});

router.get("/metadata/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null })
    .select("orgId mimeType originalName size checksum createdAt updatedAt")
    .lean();
  if (!file) return void res.status(404).json({ error: "File not found" });
  await verifyAccess(req.user!.userId, file.orgId);

  const meta = await getFileMetadata(req.params.id);

  res.json({
    success: true,
    data: meta || {},
    file: {
      mimeType: file.mimeType,
      originalName: file.originalName,
      size: file.size,
      checksum: file.checksum,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    },
  });
});

router.get("/stream/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) return void res.status(404).json({ error: "File not found" });
  await verifyAccess(req.user!.userId, file.orgId);

  const info = await getFileInfo(req.params.id);
  if (!info) return void res.status(404).json({ error: "File not found" });

  if (handleConditionalRequest(req as any, res, info.etag, info.lastModified)) return;

  await streamFile(req.params.id, req as any, res);
});

router.get("/download/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) return void res.status(404).json({ error: "File not found" });
  await verifyAccess(req.user!.userId, file.orgId);

  const result = await getFileStream(req.params.id);
  if (!result) throw new AppError(404, "File not found");

  const isPreview = req.query.preview === "true";
  res.set("Content-Type", result.mimeType);
  res.set("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${result.originalName}"`);
  res.set("Content-Length", String(result.size));
  res.set("Cache-Control", "public, max-age=3600");
  res.send(result.buffer);
});

router.get("/conversion/:orgId/*storageKey", async (req: AuthRequest, res: Response) => {
  await verifyAccess(req.user!.userId, req.params.orgId);
  const storageKey = (req.params as any).storageKey;
  if (!storageKey) return void res.status(400).json({ error: "Invalid storage key" });
  const result = await getConvertedFile(storageKey);
  if (!result) return void res.status(404).json({ error: "Converted file not found" });

  res.set("Content-Type", result.mimeType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(result.buffer);
});

router.post("/cleanup", async (req: AuthRequest, res: Response) => {
  await requireOrgMembership(req.user!.userId, req.user!.orgId!, req.user!.email, req.user!.orgId!);
  if (req.user!.role !== "admin") throw new AppError(403, "Admin access required");

  const result = await runFullCleanup();
  res.json({ success: true, data: result });
});

// ─── Legacy: keep old route paths working ───────────────────────────────

router.get("/:id/thumbnail", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) return void res.status(404).json({ error: "File not found" });
  await verifyAccess(req.user!.userId, file.orgId);

  const result = await getThumbnail(req.params.id, "medium");
  if (!result) return void res.status(404).json({ error: "Thumbnail not available" });

  res.set("Content-Type", result.mimeType);
  res.set("Cache-Control", "public, max-age=86400");
  res.send(result.buffer);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const result = await getFileStream(req.params.id);
  if (!result) throw new AppError(404, "File not found");
  res.set("Content-Type", result.mimeType);
  res.set("Content-Disposition", `inline; filename="${result.originalName}"`);
  res.send(result.buffer);
});

router.get("/:id/download", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const result = await getFileStream(req.params.id);
  if (!result) throw new AppError(404, "File not found");

  const isPreview = req.query.preview === "true";
  res.set("Content-Type", result.mimeType);
  res.set("Content-Disposition", `${isPreview ? "inline" : "attachment"}; filename="${result.originalName}"`);
  res.set("Content-Length", String(result.size));
  res.send(result.buffer);
});

router.get("/:id/versions", async (req: AuthRequest, res: Response) => {
  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId").lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const versions = await FileVersion.find({ fileId: req.params.id }).sort({ versionNumber: -1 }).select("id fileId versionNumber storagePath size uploadedBy comment createdAt").lean();
  const userIds = [...new Set(versions.map(v => v.uploadedBy))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ id: { $in: userIds } }).select("id name").lean();
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

  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId id storagePath size currentVersion").lean();
  if (!file) throw new AppError(404, "File not found");
  await verifyAccess(req.user!.userId, file.orgId);

  const version = await FileVersion.findOne({ id: versionId, fileId: file.id }).select("id storagePath size versionNumber").lean();
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
  const share = await FileShare.findOne({ id }).select("orgId").lean();
  if (!share) throw new AppError(404, "Share not found");
  await verifyOrgAccess(req.user!.userId, share.orgId);
  await FileShare.deleteOne({ id });
  res.json({ success: true });
});

router.post("/upload", upload.fields([{ name: "files", maxCount: 50 }, { name: "file", maxCount: 50 }]), async (req: AuthRequest, res: Response) => {
  const uploadStart = Date.now();
  const orgId = req.body.orgId as string;
  if (!orgId) throw new AppError(400, "orgId is required");
  const files = collectedUploadFiles(req);
  if (!files.length) throw new AppError(400, "No files provided");

  await verifyAccess(req.user!.userId, orgId);

  const results: { originalName: string; fileId: string; error?: string }[] = [];

  for (const file of files) {
    try {
      const result = await uploadFile({
        orgId,
        folderId: req.body.folderId as string | undefined,
        taskId: req.body.taskId as string | undefined,
        clientId: req.body.clientId as string | undefined,
        projectId: req.body.projectId as string | undefined,
        uploaderId: req.user!.userId,
        name: file.originalname,
        originalName: file.originalname,
        mimeType: file.mimetype || "application/octet-stream",
        size: file.size,
        buffer: file.buffer,
        description: req.body.description as string || "",
        tags: req.body.tags ? (typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags) : [],
        skipDuplicates: req.body.skipDuplicates !== "false",
        moduleName: req.body.moduleName as string | undefined,
        entityId: req.body.entityId as string | undefined,
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
  console.log(`[PERF] POST /upload (${files.length} files) took ${Date.now() - uploadStart}ms`);
  res.status(201).json({ success: true, total: files.length, uploaded: successCount, results });
});

router.post("/:id/duplicate", async (req: AuthRequest, res: Response) => {
  const newId = await duplicateFile(req.params.id, req.user!.userId);
  res.status(201).json({ success: true, fileId: newId });
});

router.patch("/:id", async (req: AuthRequest, res: Response) => {
  const { name, description, tags, folderId } = req.body;

  const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).select("orgId id originalName isLocked lockedBy").lean();
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

  invalidateFileCaches(file.orgId);

  res.json({ success: true });
});

router.post("/bulk/delete", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("orgId").lean();
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

  invalidateFileCaches(orgIds[0]);

  res.json({ success: true, deleted: fileIds.length });
});

router.post("/bulk/restore", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: { $ne: null } }).select("orgId").lean();
  if (!files.length) throw new AppError(404, "No files found in trash");
  await verifyAccess(req.user!.userId, files[0].orgId);

  await FileAttachment.updateMany(
    { id: { $in: fileIds }, deletedAt: { $ne: null } },
    { deletedAt: null, deletedBy: null },
  );

  invalidateFileCaches(files[0].orgId);

  res.json({ success: true, restored: fileIds.length });
});

router.post("/bulk/move", async (req: AuthRequest, res: Response) => {
  const { fileIds, targetFolderId } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("orgId").lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  await FileAttachment.updateMany(
    { id: { $in: fileIds }, deletedAt: null },
    { folderId: targetFolderId || null },
  );

  invalidateFileCaches(files[0].orgId);

  res.json({ success: true, moved: fileIds.length });
});

router.post("/bulk/tag", async (req: AuthRequest, res: Response) => {
  const { fileIds, tags, action: tagAction } = req.body;
  if (!fileIds?.length || !tags?.length) throw new AppError(400, "fileIds and tags are required");

  const files = await FileAttachment.find({ id: { $in: fileIds }, deletedAt: null }).select("orgId").lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  if (tagAction === "remove") {
    await FileAttachment.updateMany({ id: { $in: fileIds } }, { $pullAll: { tags } });
  } else {
    await FileAttachment.updateMany({ id: { $in: fileIds } }, { $addToSet: { tags: { $each: tags } } });
  }

  invalidateFileCaches(files[0].orgId);

  res.json({ success: true });
});

router.post("/bulk/permanent", async (req: AuthRequest, res: Response) => {
  const { fileIds } = req.body;
  if (!fileIds?.length) throw new AppError(400, "fileIds is required");

  const files = await FileAttachment.find({ id: { $in: fileIds } }).select("orgId id storagePath size").lean();
  if (!files.length) throw new AppError(404, "No files found");
  await verifyAccess(req.user!.userId, files[0].orgId);

  const provider = (await import("../lib/storage/providers.js")).getStorageProvider();
  let totalSizeFreed = 0;
  for (const file of files) {
    try { await provider.delete(file.storagePath); } catch { /* skip */ }
    const versions = await FileVersion.find({ fileId: file.id }).select("id storagePath").lean();
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

// ─── Archive Content Listing ────────────────────────────────────────────────────

router.get("/archive/:id", async (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: [] });
});

// ─── R2 Presigned Upload ──────────────────────────────────────────────────────

router.post("/presigned-upload", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, fileName, mimeType, size } = req.body;
    if (!orgId || !fileName) throw new AppError(400, "orgId and fileName are required");

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const signedUrlService = new SignedUrlService();
    const key = `${orgId}/${Date.now()}-${uuid()}-${fileName}`;
    const url = await signedUrlService.getUploadUrl(key, mimeType || "application/octet-stream");

    res.json({ success: true, data: { url, key } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to generate presigned upload URL");
  }
});

// ─── R2 Presigned Download ────────────────────────────────────────────────────

router.post("/presigned-download", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, keys, fileId } = req.body;
    if (!orgId) throw new AppError(400, "orgId is required");

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const signedUrlService = new SignedUrlService();

    if (fileId) {
      const file = await FileAttachment.findOne({ id: fileId, orgId, deletedAt: null }).lean();
      if (!file) throw new AppError(404, "File not found");

      const url = await signedUrlService.getDownloadUrl(file.storagePath);
      res.json({ success: true, data: { url, key: file.storagePath } });
      return;
    }

    if (keys && Array.isArray(keys)) {
      const urls = await signedUrlService.getBatchDownloadUrls(keys);
      const result = Array.from(urls.entries()).map(([key, url]) => ({ key, url }));
      res.json({ success: true, data: { urls: result } });
      return;
    }

    throw new AppError(400, "fileId or keys is required");
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to generate presigned download URL");
  }
});

// ─── R2 Multipart Upload ──────────────────────────────────────────────────────

router.post("/multipart/init", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, fileName, mimeType } = req.body;
    if (!orgId || !fileName) throw new AppError(400, "orgId and fileName are required");

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const key = `${orgId}/multipart/${Date.now()}-${uuid()}-${fileName}`;
    const provider = getStorageProvider();
    const uploadId = await provider.initMultipartUpload(key);

    res.json({ success: true, data: { uploadId, key } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to initialize multipart upload");
  }
});

router.post("/multipart/part-url", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, key, uploadId, partNumber } = req.body;
    if (!orgId || !key || !uploadId || !partNumber) {
      throw new AppError(400, "orgId, key, uploadId, and partNumber are required");
    }

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const provider = getStorageProvider();
    const url = await provider.getPresignedUploadPartUrl(key, uploadId, partNumber);

    res.json({ success: true, data: { url } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to generate part upload URL");
  }
});

router.post("/multipart/complete", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, key, uploadId, parts } = req.body;
    if (!orgId || !key || !uploadId || !parts) {
      throw new AppError(400, "orgId, key, uploadId, and parts are required");
    }

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const provider = getStorageProvider();
    await provider.completeMultipartUpload(key, uploadId, parts);

    await recordAuditLog({
      orgId, userId: req.user!.userId, createdBy: req.user!.userId,
      action: "file.multipart.completed", entityType: "file", entityId: key,
      description: "Multipart upload completed",
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to complete multipart upload");
  }
});

router.post("/multipart/abort", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, key, uploadId } = req.body;
    if (!orgId || !key || !uploadId) {
      throw new AppError(400, "orgId, key, and uploadId are required");
    }

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const provider = getStorageProvider();
    await provider.abortMultipartUpload(key, uploadId);

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to abort multipart upload");
  }
});

// ─── File Processing Pipeline ─────────────────────────────────────────────────

router.post("/process", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId, fileId } = req.body;
    if (!orgId || !fileId) throw new AppError(400, "orgId and fileId are required");

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const file = await FileAttachment.findOne({ id: fileId, orgId, deletedAt: null }).lean();
    if (!file) throw new AppError(404, "File not found");

    await recordAuditLog({
      orgId, userId: req.user!.userId, createdBy: req.user!.userId,
      action: "file.processing.triggered", entityType: "file", entityId: fileId,
      description: `File processing pipeline triggered for "${file.originalName}"`,
    });

    res.json({ success: true, message: "File processing pipeline triggered" });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to trigger file processing");
  }
});

// ─── Storage Analytics ────────────────────────────────────────────────────────

router.get("/analytics/stats", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    if (!orgId) throw new AppError(400, "orgId is required");

    await requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);

    const [totalFiles, sizeAgg, deletedCount, byExtension, byMimeType, dailyUploads] = await Promise.all([
      FileAttachment.countDocuments({ orgId, deletedAt: null }),
      FileAttachment.aggregate([
        { $match: { orgId, deletedAt: null } },
        { $group: { _id: null, totalSize: { $sum: "$size" }, avgSize: { $avg: "$size" }, maxSize: { $max: "$size" } } },
      ]),
      FileAttachment.countDocuments({ orgId, deletedAt: { $ne: null } }),
      FileAttachment.aggregate([
        { $match: { orgId, deletedAt: null } },
        { $addFields: { ext: { $toLower: { $ifNull: [{ $last: { $split: ["$originalName", "."] } }, "unknown"] } } } },
        { $group: { _id: "$ext", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      FileAttachment.aggregate([
        { $match: { orgId, deletedAt: null } },
        { $group: { _id: { $arrayElemAt: [{ $split: ["$mimeType", "/"] }, 0] }, count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      ]),
      FileAttachment.aggregate([
        { $match: { orgId, deletedAt: null, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const stats = sizeAgg[0] || { totalSize: 0, avgSize: 0, maxSize: 0 };

    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize: stats.totalSize,
        averageFileSize: Math.round(stats.avgSize),
        largestFileSize: stats.maxSize,
        deletedFiles: deletedCount,
        byExtension: byExtension.map((e: any) => ({ ext: e._id, count: e.count, size: e.totalSize })),
        byType: byMimeType.map((t: any) => ({ type: t._id, count: t.count, size: t.totalSize })),
        dailyUploads: dailyUploads.map((d: any) => ({ date: d._id, count: d.count, size: d.totalSize })),
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not load analytics");
  }
});

export default router;
