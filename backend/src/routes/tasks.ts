import { Router, Response } from "express";
import { Task } from "../lib/db/models/Task.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

async function getUserOrgId(userId: string): Promise<string> {
  const member = await OrgMember.findOne({ userId }).lean();
  if (!member) throw new AppError(403, "User is not a member of any organization");
  return member.orgId.toString();
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await getUserOrgId(req.user!.userId);
  const tasks = await Task.find({ orgId }).sort({ createdAt: -1 }).lean();

  // Collect all user IDs for assignee + creator
  const userIds = new Set<string>();
  tasks.forEach((t) => {
    if (t.assigneeId) userIds.add(t.assigneeId.toString());
    if (t.creatorId) userIds.add(t.creatorId.toString());
  });

  const users = await User.find({ _id: { $in: [...userIds] } }).select("name email image").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const result = tasks.map((t) => {
    const assignee = t.assigneeId ? userMap.get(t.assigneeId.toString()) : null;
    const creator = t.creatorId ? userMap.get(t.creatorId.toString()) : null;
    return {
      _id: t._id.toString(),
      title: t.title,
      description: t.description || "",
      project: t.project || "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate || null,
      assigneeId: t.assigneeId ? t.assigneeId.toString() : "",
      assigneeName: assignee?.name || "",
      assigneeAvatar: assignee?.image || "",
      creatorId: t.creatorId ? t.creatorId.toString() : "",
      creatorName: creator?.name || "",
      createdAt: t.createdAt,
    };
  });

  res.json({ success: true, data: result });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { orgId, title, description, priority, assigneeId, teamId, dueDate, project } = req.body;
  if (!title) throw new AppError(400, "Title is required");
  if (!orgId) throw new AppError(400, "orgId is required");

  const task = await Task.create({
    orgId,
    teamId: teamId || undefined,
    assigneeId: assigneeId || req.user!.userId,
    creatorId: req.user!.userId,
    title,
    description: description || undefined,
    project: project || undefined,
    priority: priority || "medium",
    dueDate: dueDate ? new Date(dueDate) : undefined,
  });

  await ActivityLog.create({
    orgId,
    userId: req.user!.userId,
    action: "task.created",
    entityType: "task",
    entityId: task._id.toString(),
    description: `Task "${title}" created`,
  });

  res.status(201).json({ success: true, data: { taskId: task._id } });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { title, status, priority, assigneeId, description, dueDate, project } = req.body;
  const userOrgId = await getUserOrgId(req.user!.userId);

  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (assigneeId !== undefined) updates.assigneeId = assigneeId;
  if (description !== undefined) updates.description = description;
  if (project !== undefined) updates.project = project;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

  await Task.findByIdAndUpdate(id, updates);

  await ActivityLog.create({
    orgId: existing.orgId,
    userId: req.user!.userId,
    action: "task.updated",
    entityType: "task",
    entityId: id,
    description: `Task updated: ${status ? `status changed to ${status}` : title ? `title updated` : ""}`,
  });

  res.json({ success: true });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await getUserOrgId(req.user!.userId);
  const existing = await Task.findById(req.params.id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to delete this task");

  await Task.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  const { status } = req.body;
  if (!status) throw new AppError(400, "Status is required");
  const userOrgId = await getUserOrgId(req.user!.userId);

  const existing = await Task.findById(req.params.id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

  await Task.findByIdAndUpdate(req.params.id, { status });
  res.json({ success: true });
});

export default router;
