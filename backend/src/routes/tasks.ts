import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  batchUpdateStatus,
  updateTaskStatus,
} from "../services/task.service.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await listTasks({
      orgId,
      userId: req.user!.userId,
      page,
      limit,
      status: req.query.status as string | undefined,
      priority: req.query.priority as string | undefined,
      assigneeId: req.query.assigneeId as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: req.query.sortOrder as string | undefined,
      scope: req.query.scope as string | undefined,
      afterId: req.query.afterId as string | undefined,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch tasks");
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);

    const result = await createTask({
      orgId,
      userId: req.user!.userId,
      title: req.body.title,
      description: req.body.description,
      priority: req.body.priority,
      assigneeId: req.body.assigneeId,
      teamId: req.body.teamId,
      project: req.body.project,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      isSaved: req.body.isSaved,
      isActive: req.body.isActive,
    });

    res.status(201).json({ success: true, data: { taskId: result.taskId } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to create task");
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await updateTask(req.params.id, req.user!.userId, req.body, req.query.scope as string | undefined);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update task");
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await deleteTask(req.params.id, req.user!.userId, req.query.scope as string | undefined);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to delete task");
  }
});

router.patch("/batch/status", async (req: AuthRequest, res: Response) => {
  try {
    const { taskIds, status } = req.body;
    if (!status) throw new AppError(400, "Status is required");
    if (!Array.isArray(taskIds) || taskIds.length === 0) throw new AppError(400, "taskIds must be a non-empty array");

    const result = await batchUpdateStatus(taskIds, status, req.user!.userId);

    res.json({ success: true, data: { matched: result.matched, modified: result.modified } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to batch update tasks");
  }
});

router.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError(400, "Status is required");

    await updateTaskStatus(req.params.id, status, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update task status");
  }
});

export default router;
