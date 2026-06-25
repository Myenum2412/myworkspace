import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { Project } from "../lib/db/models/Project.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);
  const projects = await Project.find({ orgId }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: projects.map(normalize) });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { orgId, name, client, color, access, status, description, deadline } = req.body;
  if (!orgId) throw new AppError(400, "orgId is required");
  if (!name) throw new AppError(400, "Name is required");

  const project = await Project.create({
    id: uuid(),
    orgId,
    name,
    client: client || "",
    color: color || "#3b82f6",
    description: description || "",
    deadline: deadline || null,
    tracked: 0,
    progress: 0,
    access: access || "Public",
    status: status || "Active",
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

  const result = await Project.findOneAndUpdate(
    { id: req.params.id },
    { $set: updates },
    { returnDocument: "after" }
  ).lean();
  if (!result) throw new AppError(404, "Project not found");
  res.json({ success: true, data: normalize(result) });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await requireOrgMembership(req.user!.userId);
  const existing = await Project.findOne({ id: req.params.id }).lean();
  if (!existing) throw new AppError(404, "Project not found");
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to delete this project");

  await Project.deleteOne({ id: req.params.id });
  res.json({ success: true });
});

type ProjectDoc = { _id?: any; id?: string; [key: string]: any };

function normalize(doc: ProjectDoc) {
  const { _id, ...rest } = doc;
  return rest;
}

export default router;
