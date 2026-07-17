import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import multer from "multer";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership, requireOrgMembershipFromRequest } from "../lib/org-utils.js";
import { Project } from "../lib/db/models/Project.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { recordAuditLog } from "../services/audit.service.js";
import { uploadFile } from "../services/file.service.js";
import { cacheManager } from "../lib/cache.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { requireString, optionalString, requireEnum, optionalArray, PROJECT_STATUSES, PROJECT_ACCESS } from "../lib/validate.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

router.use(authenticate);

router.get("/", cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["projects"] }), async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);
  const projects = await Project.find({ orgId }).sort({ createdAt: -1 }).select("id name client color description deadline tracked progress access status members priority category budget spent startDate createdAt updatedAt orgId health").lean();
  res.json({ success: true, data: projects.map(normalize) });
});

router.post("/", upload.single("attachment"), async (req: AuthRequest, res: Response) => {
  // Enforce workspace isolation: resolve orgId from membership, not from request body
  const orgId = await requireOrgMembership(req.user!.userId, req.body.orgId || undefined, req.user!.email, req.user!.orgId);
  const name = requireString(req.body.name, "name", { min: 1, max: 200 });
  const client = optionalString(req.body.client, "client", { max: 200 }) ?? "";
  const color = optionalString(req.body.color, "color", { max: 20 }) ?? "#3b82f6";
  const access = req.body.access !== undefined ? requireEnum(req.body.access, PROJECT_ACCESS, "access") : "Public";
  const status = req.body.status !== undefined ? requireEnum(req.body.status, PROJECT_STATUSES, "status") : "Active";
  const description = optionalString(req.body.description, "description", { max: 5000 }) ?? "";
  const members = (optionalArray(req.body.members, "members") || []).map((m) => String(m));
  const priority = ["low", "medium", "high", "critical"].includes(req.body.priority) ? req.body.priority : "medium";
  const category = optionalString(req.body.category, "category", { max: 100 }) ?? "";
  const budget = typeof req.body.budget === "number" ? req.body.budget : 0;
  const health = ["on-track", "at-risk", "delayed"].includes(req.body.health) ? req.body.health : "on-track";

  let deadline: Date | null = null;
  if (req.body.deadline) {
    const d = new Date(req.body.deadline);
    if (isNaN(d.getTime())) throw new AppError(400, "Invalid deadline", { deadline: "must be a valid date" });
    deadline = d;
  }
  let startDate: Date | null = null;
  if (req.body.startDate) {
    const d = new Date(req.body.startDate);
    if (!isNaN(d.getTime())) startDate = d;
  }

  const project = await Project.create({
    id: uuid(),
    orgId,
    name,
    client,
    color,
    description,
    deadline,
    tracked: 0,
    progress: 0,
    access,
    status,
    members,
    priority,
    category,
    budget,
    startDate,
    health,
  });

  let attachmentFileId: string | null = null;
  if (req.file) {
    try {
      const result = await uploadFile({
        orgId,
        projectId: project.id,
        uploaderId: req.user!.userId,
        name: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || "application/octet-stream",
        size: req.file.size,
        buffer: req.file.buffer,
      });
      attachmentFileId = result.fileId;
    } catch (err: any) {
      // attachment failed but project still created
    }
  }

  await recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    description: `Project "${name}" created`,
  });

  cacheManager.invalidatePattern(`projects:${orgId}`);

  const data = normalize(project);
  res.status(201).json({ success: true, data: { ...data, attachmentFileId } });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await requireOrgMembershipFromRequest(req);
  const existing = await Project.findOne({ id: req.params.id }).lean();
  if (!existing) throw new AppError(404, "Project not found");
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to modify this project");

  const { name, client, color, access, status, description, deadline, tracked, progress, members, priority, category, budget, spent, startDate } = req.body;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (client !== undefined) updates.client = client;
  if (color !== undefined) updates.color = color;
  if (access !== undefined) updates.access = access;
  if (status !== undefined) updates.status = status;
  if (description !== undefined) updates.description = description;
  if (deadline !== undefined) updates.deadline = deadline;
  if (tracked !== undefined) updates.tracked = tracked;
  if (progress !== undefined) updates.progress = progress;
  if (members !== undefined) updates.members = members;
  if (priority !== undefined) updates.priority = priority;
  if (category !== undefined) updates.category = category;
  if (budget !== undefined) updates.budget = budget;
  if (spent !== undefined) updates.spent = spent;
  if (startDate !== undefined) updates.startDate = startDate;

  const [result] = await Promise.all([
    Project.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { returnDocument: "after" }
    ).lean(),
    recordAuditLog({
      orgId: existing.orgId,
      userId: req.user!.userId,
      createdBy: req.user!.userId,
      action: "project.updated",
      entityType: "project",
      entityId: req.params.id,
      description: `Project "${existing.name}" updated`,
    }),
  ]);
  if (!result) throw new AppError(404, "Project not found");

  cacheManager.invalidatePattern(`projects:${existing.orgId}`);
  cacheManager.invalidatePattern(`project:${req.params.id}`);

  res.json({ success: true, data: normalize(result) });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await requireOrgMembershipFromRequest(req);
  const existing = await Project.findOne({ id: req.params.id }).lean();
  if (!existing) throw new AppError(404, "Project not found");
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to delete this project");

  await Promise.all([
    Project.deleteOne({ id: req.params.id }),
    recordAuditLog({
      orgId: existing.orgId,
      userId: req.user!.userId,
      createdBy: req.user!.userId,
      action: "project.deleted",
      entityType: "project",
      entityId: req.params.id,
      description: `Project "${existing.name}" deleted`,
    }),
  ]);

  cacheManager.invalidatePattern(`projects:${existing.orgId}`);
  cacheManager.invalidatePattern(`project:${req.params.id}`);

  res.json({ success: true });
});

type ProjectDoc = { _id?: any; id?: string; [key: string]: any };

function normalize(doc: ProjectDoc) {
  const { _id, ...rest } = doc;
  return rest;
}

export default router;
