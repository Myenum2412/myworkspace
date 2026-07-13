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
  assignIndividualTask,
  submitForVerification,
  approveTeamTask,
  rejectTeamTask,
  publishCommonTask,
  activateUpcomingTask,
  publishDraft,
  autoActivateScheduledTasks,
} from "../services/task.service.js";

const router = Router();

router.use(authenticate);

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
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
      type: req.query.type as string | undefined,
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

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);

    const result = await createTask({
      orgId,
      userId: req.user!.userId,
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      priority: req.body.priority,
      assigneeId: req.body.assigneeId,
      teamId: req.body.teamId,
      project: req.body.project,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
      selectedUserIds: req.body.selectedUserIds,
      isSaved: req.body.isSaved,
      isActive: req.body.isActive,
    });

    res.status(201).json({ success: true, data: { taskId: result.taskId, type: result.type, status: result.status } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to create task");
  }
});

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await updateTask(req.params.id, req.user!.userId, req.body, req.query.scope as string | undefined);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update task");
  }
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    await deleteTask(req.params.id, req.user!.userId, req.query.scope as string | undefined);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to delete task");
  }
});

// ─────────────────────────────────────────────
// BATCH STATUS UPDATE
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// SINGLE STATUS UPDATE
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// INDIVIDUAL: Assign task to a user
// ─────────────────────────────────────────────
router.post("/:id/assign", async (req: AuthRequest, res: Response) => {
  try {
    const { assigneeId } = req.body;
    if (!assigneeId) throw new AppError(400, "assigneeId is required");
    await assignIndividualTask(req.params.id, assigneeId, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to assign task");
  }
});

// ─────────────────────────────────────────────
// TEAM: Submit for verification
// ─────────────────────────────────────────────
router.post("/:id/submit-verification", async (req: AuthRequest, res: Response) => {
  try {
    await submitForVerification(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to submit for verification");
  }
});

// ─────────────────────────────────────────────
// TEAM: Approve
// ─────────────────────────────────────────────
router.post("/:id/approve", async (req: AuthRequest, res: Response) => {
  try {
    await approveTeamTask(req.params.id, req.user!.userId, req.body.note);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to approve task");
  }
});

// ─────────────────────────────────────────────
// TEAM: Reject
// ─────────────────────────────────────────────
router.post("/:id/reject", async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new AppError(400, "Rejection reason is required");
    await rejectTeamTask(req.params.id, req.user!.userId, reason);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to reject task");
  }
});

// ─────────────────────────────────────────────
// COMMON: Publish
// ─────────────────────────────────────────────
router.post("/:id/publish", async (req: AuthRequest, res: Response) => {
  try {
    await publishCommonTask(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to publish task");
  }
});

// ─────────────────────────────────────────────
// UPCOMING: Activate
// ─────────────────────────────────────────────
router.post("/:id/activate", async (req: AuthRequest, res: Response) => {
  try {
    await activateUpcomingTask(req.params.id, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to activate task");
  }
});

// ─────────────────────────────────────────────
// DRAFT: Publish as a specific task type
// ─────────────────────────────────────────────
router.post("/:id/publish-draft", async (req: AuthRequest, res: Response) => {
  try {
    const { targetType, assigneeId, teamId, selectedUserIds, scheduledDate } = req.body;
    if (!targetType) throw new AppError(400, "targetType is required");
    await publishDraft(req.params.id, req.user!.userId, targetType, {
      assigneeId, teamId, selectedUserIds,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
    });
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to publish draft");
  }
});

// ─────────────────────────────────────────────
// SYSTEM: Auto-activate scheduled upcoming tasks
// ─────────────────────────────────────────────
router.post("/system/auto-activate", async (_req: AuthRequest, res: Response) => {
  try {
    const count = await autoActivateScheduledTasks();
    res.json({ success: true, data: { activated: count } });
  } catch (err: any) {
    throw new AppError(500, err.message || "Failed to auto-activate tasks");
  }
});

export default router;
