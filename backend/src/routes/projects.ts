import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { Project } from "../lib/db/models/Project.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { requireString, optionalString, requireEnum, optionalArray, PROJECT_STATUSES, PROJECT_ACCESS } from "../lib/validate.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);
  const projects = await Project.find({ orgId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: projects.map(normalize) });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const orgId = requireString(req.body.orgId, "orgId");
  const name = requireString(req.body.name, "name", { min: 1, max: 200 });
  const client = optionalString(req.body.client, "client", { max: 200 }) ?? "";
  const color = optionalString(req.body.color, "color", { max: 20 }) ?? "#3b82f6";
  const access = req.body.access !== undefined ? requireEnum(req.body.access, PROJECT_ACCESS, "access") : "Public";
  const status = req.body.status !== undefined ? requireEnum(req.body.status, PROJECT_STATUSES, "status") : "Active";
  const description = optionalString(req.body.description, "description", { max: 5000 }) ?? "";
  let deadline: Date | null = null;
  if (req.body.deadline) {
    const d = new Date(req.body.deadline);
    if (isNaN(d.getTime())) throw new AppError(400, "Invalid deadline", { deadline: "must be a valid date" });
    deadline = d;
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
  });

  // Activity log is non-blocking; the user-facing path depends on response + emit.
  void ActivityLog.create({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "project.created",
    entityType: "project",
    entityId: project.id,
    description: `Project "${name}" created`,
  });

  socketIOManager.emitToOrg(orgId, "project:created", {
    id: project.id,
    orgId,
    name,
    status: project.status,
    color: project.color,
  });

  res.status(201).json({ success: true, data: normalize(project) });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await requireOrgMembership(req.user!.userId);
  const existing = await Project.findOne({ id: req.params.id }).lean();
  if (!existing) throw new AppError(404, "Project not found");
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to modify this project");

  const { name, client, color, access, status, description, deadline, tracked, progress } = req.body;
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

  const [result] = await Promise.all([
    Project.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { returnDocument: "after" }
    ).lean(),
    ActivityLog.create({
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

  socketIOManager.emitToOrg(existing.orgId, "project:updated", {
    id: req.params.id,
    orgId: existing.orgId,
    ...updates,
    updatedAt: result.updatedAt,
  });

  res.json({ success: true, data: normalize(result) });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await requireOrgMembership(req.user!.userId);
  const existing = await Project.findOne({ id: req.params.id }).lean();
  if (!existing) throw new AppError(404, "Project not found");
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to delete this project");

  await Promise.all([
    Project.deleteOne({ id: req.params.id }),
    ActivityLog.create({
      orgId: existing.orgId,
      userId: req.user!.userId,
      createdBy: req.user!.userId,
      action: "project.deleted",
      entityType: "project",
      entityId: req.params.id,
      description: `Project "${existing.name}" deleted`,
    }),
  ]);

  socketIOManager.emitToOrg(existing.orgId, "project:deleted", {
    id: req.params.id,
    orgId: existing.orgId,
  });

  res.json({ success: true });
});

type ProjectDoc = { _id?: any; id?: string; [key: string]: any };

function normalize(doc: ProjectDoc) {
  const { _id, ...rest } = doc;
  return rest;
}

export default router;
