import { Router, Response } from "express";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { Folder } from "../lib/db/models/Folder.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.query.orgId as string;
  const q = req.query.q as string;
  const type = req.query.type as string;
  const uploaderId = req.query.uploaderId as string;
  const dateFrom = req.query.dateFrom as string;
  const dateTo = req.query.dateTo as string;
  const tags = req.query.tags as string;
  const folderId = req.query.folderId as string;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = (page - 1) * limit;

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!q && !type && !uploaderId && !dateFrom && !dateTo && !tags) {
    throw new AppError(400, "At least one search criterion is required");
  }

  const member = await OrgMember.findOne({ userId: req.user!.userId, orgId }).lean();
  if (!member) throw new AppError(403, "Not authorized");

  const match: Record<string, any> = { orgId, deletedAt: null };

  if (q) {
    match.$or = [
      { name: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { originalName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { description: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    ];
  }

  if (type) {
    if (type === "document") match.mimeType = { $in: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "text/csv"] };
    else if (type === "spreadsheet") match.mimeType = { $in: ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] };
    else if (type === "image") match.mimeType = { $regex: "^image/" };
    else if (type === "video") match.mimeType = { $regex: "^video/" };
    else if (type === "audio") match.mimeType = { $regex: "^audio/" };
    else if (type === "archive") match.mimeType = { $in: ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/gzip", "application/x-tar"] };
    else match.mimeType = { $regex: type.replace("*", ".*"), $options: "i" };
  }

  if (uploaderId) match.uploaderId = uploaderId;
  if (folderId) match.folderId = folderId;
  if (tags) match.tags = { $in: tags.split(",").map(t => t.trim()) };
  if (dateFrom || dateTo) {
    match.createdAt = {};
    if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
    if (dateTo) match.createdAt.$lte = new Date(dateTo);
  }

  const [files, total] = await Promise.all([
    FileAttachment.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FileAttachment.countDocuments(match),
  ]);

  const userIds = [...new Set(files.map(f => f.uploaderId))];
  const { User } = await import("../lib/db/models/User.js");
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userMap = new Map(users.map(u => [u._id.toString(), u.name]));

  const folders = await Folder.find({
    orgId, deletedAt: null,
    name: { $regex: q ? q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") : ".*", $options: "i" },
  }).limit(10).lean();

  res.json({
    data: {
      files: files.map(f => ({ ...f, uploaderName: userMap.get(f.uploaderId) || "Unknown" })),
      folders: folders.map(f => ({ id: f.id, name: f.name, path: f.path, parentId: f.parentId })),
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

export default router;
