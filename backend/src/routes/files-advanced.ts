import path from "path";
import fs from "fs";
import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { requireOrgMembershipFromRequest } from "../lib/org-utils.js";
import { UploadSession } from "../lib/db/models/UploadSession.js";
import { UploadApproval } from "../lib/db/models/UploadApproval.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileVersion } from "../lib/db/models/FileVersion.js";
import { Folder } from "../lib/db/models/Folder.js";
import { getEnhancedTusServer } from "../lib/tus/enhanced-server.js";
import { finalizeUpload, deleteFile, restoreFile, createFileVersion, categorizeMime } from "../lib/uploads/enhanced-orchestrator.js";
import { checkUploadPermission, isRoleApprover } from "../lib/uploads/upload-auth.js";
import { casbinCheckFileAccess, casbinCheckFolderAccess } from "../middleware/casbin-auth.js";
import { eventProducer } from "../lib/queue/producer.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { getStorageProvider } from "../lib/storage/providers.js";
import { cacheManager, getOrSet, invalidatePattern } from "../lib/cache/index.js";
import { uploadLogger } from "../lib/logger/index.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";

const router = Router();
const CONTEXT_HEADER = "x-upload-context";

interface UploadContext {
  orgId: string;
  workspaceId?: string;
  projectId?: string;
  clientId?: string;
  staffId?: string;
  departmentId?: string;
  folderId?: string;
  fileName: string;
  originalName?: string;
  mimeType?: string;
  checksum?: string;
  uploaderId?: string;
  tags?: string[];
  description?: string;
}

function decodeContext(header: string | undefined): UploadContext | null {
  if (!header) return null;
  try {
    const json = Buffer.from(header, "base64").toString("utf8");
    const ctx = JSON.parse(json) as UploadContext;
    return ctx.orgId && ctx.fileName ? ctx : null;
  } catch {
    return null;
  }
}

router.use(authenticate);

router.use(async (req: AuthRequest, res: Response) => {
  const tus = getEnhancedTusServer();
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  const role = (req.user?.role || "guest").toLowerCase();

  if (req.method === "POST") {
    const ctx = decodeContext(req.headers[CONTEXT_HEADER] as string | undefined);
    if (!ctx) {
      res.status(400).json({
        success: false,
        error: `Missing or invalid ${CONTEXT_HEADER} header`,
      });
      return;
    }

    try {
      await requireOrgMembershipFromRequest(req, ctx.orgId);
    } catch {
      res.status(403).json({ success: false, error: "Access denied to this organization" });
      return;
    }

    const role = (req.user?.role || "guest").toLowerCase();
    const permission = await checkUploadPermission({
      role,
      orgId: ctx.orgId,
      projectId: ctx.projectId || req.user?.projectId,
      clientId: ctx.clientId || req.user?.clientId,
    });

    if (!permission.allowed) {
      uploadLogger.warn({ userId, role, orgId: ctx.orgId }, "Upload permission denied by Casbin RBAC");
      res.status(403).json({ success: false, error: "You don't have permission to upload files." });
      return;
    }

    if (permission.needsApproval) {
      uploadLogger.info({ userId, role, fileName: ctx.fileName }, "Upload requires approval");
      const existingMeta = req.headers["upload-metadata"] || "";
      const needsApprovalEncoded = Buffer.from("true").toString("base64");
      const roleEncoded = Buffer.from(role).toString("base64");
      req.headers["upload-metadata"] = existingMeta
        ? `${existingMeta},needsApproval ${needsApprovalEncoded},uploaderRole ${roleEncoded}`
        : `needsApproval ${needsApprovalEncoded},uploaderRole ${roleEncoded}`;
    }

    res.locals.uploadCtx = { userId, ctx, correlationId: uuid(), needsApproval: permission.needsApproval };
  }

  return tus.handle(req, res);
});

router.get("/approvals", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.query.orgId as string;
    const status = (req.query.status as string) || "pending";

    if (!orgId) {
      res.status(400).json({ success: false, error: "orgId required" });
      return;
    }

    try {
      await requireOrgMembershipFromRequest(req, orgId);
    } catch {
      res.status(403).json({ success: false, error: "Access denied to this organization" });
      return;
    }

    if (!isRoleApprover(req.user!.role || "")) {
      res.status(403).json({ success: false, error: "Only managers and admins can view approvals" });
      return;
    }

    const approvals = await UploadApproval.find({ orgId, status })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: approvals });
  } catch (err: any) {
    uploadLogger.error({ err }, "Failed to fetch approvals");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/approvals/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const approvalId = req.params.id;

    if (!isRoleApprover(req.user?.role || "")) {
      res.status(403).json({ success: false, error: "Only managers and admins can approve uploads" });
      return;
    }

    const approval = await UploadApproval.findOne({ uploadId: approvalId, status: "pending" });
    if (!approval) {
      res.status(404).json({ success: false, error: "Pending approval not found" });
      return;
    }

    try {
      await requireOrgMembershipFromRequest(req, approval.orgId);
    } catch {
      res.status(403).json({ success: false, error: "Access denied to this organization" });
      return;
    }

    const TUS_DIR = path.resolve(process.cwd(), "data", "tus-uploads");
    const tempPath = path.join(TUS_DIR, approval.tusId);
    const infoPath = `${tempPath}.info`;

    if (!fs.existsSync(tempPath)) {
      await UploadApproval.updateOne(
        { uploadId: approvalId },
        { status: "rejected", approvedBy: userId, reviewedAt: new Date(), rejectionReason: "Temp file expired" },
      );
      await UploadSession.updateOne(
        { tusId: approval.tusId },
        { status: "expired" },
      );
      res.status(400).json({ success: false, error: "Upload temp file expired, auto-rejected" });
      return;
    }

    const buffer = fs.readFileSync(tempPath);
    const session = await UploadSession.findOne({ tusId: approval.tusId });

    const result = await finalizeUpload({
      orgId: approval.orgId,
      workspaceId: approval.workspaceId || undefined,
      projectId: approval.projectId || undefined,
      clientId: approval.clientId || undefined,
      staffId: session?.staffId || undefined,
      departmentId: session?.departmentId || undefined,
      folderId: approval.folderId || undefined,
      uploaderId: approval.uploaderId,
      name: approval.fileName,
      originalName: approval.fileName,
      mimeType: approval.mimeType,
      size: buffer.length,
      buffer,
      uploadId: approval.uploadId,
    });

    await UploadApproval.updateOne(
      { uploadId: approvalId },
      { status: "approved", approvedBy: userId, reviewedAt: new Date() },
    );

    await UploadSession.updateOne(
      { tusId: approval.tusId },
      {
        status: "finalized",
        fileId: result.kind === "created" ? result.fileId : result.fileId,
        completedAt: new Date(),
      },
    );

    for (const p of [tempPath, infoPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    socketIOManager.emitToOrg(approval.orgId, "upload:approved", {
      uploadId: approval.uploadId,
      fileId: result.fileId,
      fileName: approval.fileName,
      approvedBy: userId,
    });

    uploadLogger.info({ approvalId, fileId: result.fileId, approvedBy: userId }, "Upload approved and finalized");
    res.json({ success: true, data: { fileId: result.fileId, kind: result.kind } });
  } catch (err: any) {
    uploadLogger.error({ err }, "Failed to approve upload");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/approvals/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const approvalId = req.params.id;
    const { reason } = req.body || {};

    if (!isRoleApprover(req.user?.role || "")) {
      res.status(403).json({ success: false, error: "Only managers and admins can reject uploads" });
      return;
    }

    const approval = await UploadApproval.findOne({ uploadId: approvalId, status: "pending" });
    if (!approval) {
      res.status(404).json({ success: false, error: "Pending approval not found" });
      return;
    }

    try {
      await requireOrgMembershipFromRequest(req, approval.orgId);
    } catch {
      res.status(403).json({ success: false, error: "Access denied to this organization" });
      return;
    }

    const TUS_DIR = path.resolve(process.cwd(), "data", "tus-uploads");
    const tempPath = path.join(TUS_DIR, approval.tusId);
    const infoPath = `${tempPath}.info`;

    for (const p of [tempPath, infoPath]) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    await UploadApproval.updateOne(
      { uploadId: approvalId },
      { status: "rejected", approvedBy: userId, reviewedAt: new Date(), rejectionReason: reason || "" },
    );

    await UploadSession.updateOne(
      { tusId: approval.tusId },
      { status: "cancelled" },
    );

    socketIOManager.emitToOrg(approval.orgId, "upload:rejected", {
      uploadId: approval.uploadId,
      fileName: approval.fileName,
      rejectedBy: userId,
      reason: reason || "",
    });

    uploadLogger.info({ approvalId, rejectedBy: userId, reason }, "Upload rejected");
    res.json({ success: true, message: "Upload rejected" });
  } catch (err: any) {
    uploadLogger.error({ err }, "Failed to reject upload");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/sessions", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.query.orgId as string;

    if (!orgId) {
      res.status(400).json({ success: false, error: "orgId required" });
      return;
    }

    const sessions = await UploadSession.find({ orgId, uploaderId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: sessions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/sessions/:tusId", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const session = await UploadSession.findOne({ tusId: req.params.tusId }).lean();
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }
    res.json({ success: true, data: session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/sessions/:tusId", casbinCheckFileAccess("cancel"), async (req: AuthRequest, res: Response) => {
  try {
    const session = await UploadSession.findOne({ tusId: req.params.tusId });
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    await UploadSession.updateOne({ tusId: req.params.tusId }, { status: "cancelled" });

    await eventProducer.auditLogRecord({
      orgId: session.orgId,
      userId: req.user!.userId,
      action: "upload.cancelled",
      entityType: "upload",
      entityId: session.tusId,
      description: `Upload "${session.fileName}" cancelled`,
    });

    socketIOManager.emitToOrg(session.orgId, "upload:cancelled", {
      tusId: session.tusId,
      uploadId: session.uploadId,
      fileName: session.fileName,
    });

    res.json({ success: true, message: "Upload cancelled" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/status/:tusId", async (req: AuthRequest, res: Response) => {
  try {
    const session = await UploadSession.findOne({ tusId: req.params.tusId }).lean();
    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }
    res.json({
      success: true,
      data: {
        tusId: session.tusId,
        uploadId: session.uploadId,
        status: session.status,
        fileName: session.fileName,
        fileSize: session.size,
        mimeType: session.mimeType,
        checksum: session.checksum,
        completedAt: session.completedAt,
        createdAt: session.createdAt,
        fileId: session.fileId,
        durationMs: (session as any).durationMs,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/list", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.query.orgId as string;
    const folderId = req.query.folderId as string;
    const projectId = req.query.projectId as string;
    const clientId = req.query.clientId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const sort = (req.query.sort as string) || "-createdAt";

    if (!orgId) {
      res.status(400).json({ success: false, error: "orgId required" });
      return;
    }

    const cacheKey = `files:${orgId}:${folderId || ""}:${projectId || ""}:${page}:${limit}:${sort}`;

    const result = await getOrSet(
      cacheKey,
      async () => {
        const filter: Record<string, any> = { orgId, deletedAt: null };
        if (folderId) filter.folderId = folderId;
        if (projectId) filter.projectId = projectId;
        if (clientId) filter.clientId = clientId;

        const sortObj: Record<string, 1 | -1> = {};
        if (sort.startsWith("-")) {
          sortObj[sort.slice(1)] = -1;
        } else {
          sortObj[sort] = 1;
        }

        const total = await FileAttachment.countDocuments(filter);
        const files = await FileAttachment.find(filter)
          .sort(sortObj)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean();

        return { files, total, page, limit, totalPages: Math.ceil(total / limit) };
      },
      10000,
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/search", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    const q = req.query.q as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    if (!orgId || !q) {
      res.status(400).json({ success: false, error: "orgId and q required" });
      return;
    }

    const filter: Record<string, any> = {
      orgId,
      deletedAt: null,
      $text: { $search: q },
    };

    const total = await FileAttachment.countDocuments(filter);
    const files = await FileAttachment.find(filter)
      .sort({ score: { $meta: "textScore" } })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ success: true, data: { files, total, page, limit } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/detail/:id", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
    if (!file) {
      res.status(404).json({ success: false, error: "File not found" });
      return;
    }

    await FileAttachment.updateOne({ id: req.params.id }, { lastAccessedAt: new Date() });

    const versions = await FileVersion.find({ fileId: req.params.id })
      .sort({ versionNumber: -1 })
      .limit(10)
      .lean();

    res.json({ success: true, data: { ...file, versions } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/delete/:id", casbinCheckFileAccess("delete"), async (req: AuthRequest, res: Response) => {
  try {
    const permanent = req.query.permanent === "true";
    await deleteFile(req.params.id as string, req.user!.userId, permanent);
    await invalidatePattern(`files:${req.user!.orgId}`);
    res.json({ success: true, message: permanent ? "File permanently deleted" : "File moved to trash" });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.post("/restore/:id", casbinCheckFileAccess("restore"), async (req: AuthRequest, res: Response) => {
  try {
    await restoreFile(req.params.id as string, req.user!.userId);
    await invalidatePattern(`files:${req.user!.orgId}`);
    res.json({ success: true, message: "File restored" });
  } catch (err: any) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
    } else {
      res.status(500).json({ success: false, error: err.message });
    }
  }
});

router.get("/download/:id", casbinCheckFileAccess("download"), async (req: AuthRequest, res: Response) => {
  try {
    const file = await FileAttachment.findOne({ id: req.params.id, deletedAt: null }).lean();
    if (!file) {
      res.status(404).json({ success: false, error: "File not found" });
      return;
    }

    const provider = getStorageProvider();
    const buffer = await provider.get(file.storagePath);

    if (!buffer) {
      res.status(404).json({ success: false, error: "File data not found" });
      return;
    }

    await FileAttachment.updateOne({ id: req.params.id }, { lastAccessedAt: new Date() });

    await eventProducer.auditLogRecord({
      orgId: file.orgId,
      userId: req.user!.userId,
      action: "file.downloaded",
      entityType: "file",
      entityId: file.id,
      description: `File "${file.originalName}" downloaded`,
    });

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.originalName}"`);
    res.setHeader("Content-Length", buffer.length);
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/versions/:id", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const versions = await FileVersion.find({ fileId: req.params.id })
      .sort({ versionNumber: -1 })
      .lean();
    res.json({ success: true, data: versions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/stats", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    if (!orgId) {
      res.status(400).json({ success: false, error: "orgId required" });
      return;
    }

    const stats = await getOrSet(
      `filestats:${orgId}`,
      async () => {
        const totalFiles = await FileAttachment.countDocuments({ orgId, deletedAt: null });
        const totalSize = await FileAttachment.aggregate([
          { $match: { orgId, deletedAt: null } },
          { $group: { _id: null, total: { $sum: "$size" } } },
        ]);
        const byCategory = await FileAttachment.aggregate([
          { $match: { orgId, deletedAt: null } },
          { $group: { _id: "$category", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        ]);
        const byMime = await FileAttachment.aggregate([
          { $match: { orgId, deletedAt: null } },
          { $group: { _id: "$mimeType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]);

        return {
          totalFiles,
          totalSize: totalSize[0]?.total || 0,
          byCategory,
          topMimeTypes: byMime,
        };
      },
      30000,
    );

    res.json({ success: true, data: stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/recent", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const orgId = req.query.orgId as string;
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

    if (!orgId) {
      res.status(400).json({ success: false, error: "orgId required" });
      return;
    }

    const files = await FileAttachment.find({ orgId, uploaderId: userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: files });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/trash", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    if (!orgId) {
      res.status(400).json({ success: false, error: "orgId required" });
      return;
    }

    const filter = { orgId, deletedAt: { $ne: null } };
    const total = await FileAttachment.countDocuments(filter);
    const files = await FileAttachment.find(filter)
      .sort({ deletedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({ success: true, data: { files, total, page, limit, totalPages: Math.ceil(total / limit) } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/update/:id", casbinCheckFileAccess("edit"), async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, tags, folderId } = req.body;
    const update: Record<string, any> = { updatedBy: req.user!.userId };
    if (name) update.name = name;
    if (description !== undefined) update.description = description;
    if (tags) update.tags = tags;
    if (folderId !== undefined) update.folderId = folderId;

    const file = await FileAttachment.findOneAndUpdate({ id: req.params.id, deletedAt: null }, update, { new: true }).lean();
    if (!file) {
      res.status(404).json({ success: false, error: "File not found" });
      return;
    }

    await invalidatePattern(`files:${file.orgId}`);
    socketIOManager.emitToOrg(file.orgId, "file:updated", { fileId: req.params.id, ...update });

    res.json({ success: true, data: file });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/by-folder/:folderId", casbinCheckFileAccess("view"), async (req: AuthRequest, res: Response) => {
  try {
    const folderId = req.params.folderId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const folder = await Folder.findOne({ id: folderId }).lean();
    if (!folder) {
      res.status(404).json({ success: false, error: "Folder not found" });
      return;
    }

    const filter = { orgId: folder.orgId, folderId, deletedAt: null };
    const total = await FileAttachment.countDocuments(filter);
    const files = await FileAttachment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: { files, total, page, limit, totalPages: Math.ceil(total / limit), folder },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export { CONTEXT_HEADER };
export default router;
