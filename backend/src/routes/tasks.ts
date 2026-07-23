import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
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
import { logger } from "../lib/logger/index.js";
import { Task } from "../lib/db/models/Task.js";
import { notifyTask, notifyTaskCreatedAndAssignees } from "../lib/notifications/notification-wiring.js";
import { createNotification } from "../services/notification.service.js";

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
    throw new AppError(500, err.message || "Could not load tasks");
  }
});

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can create tasks");
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

    notifyTaskCreatedAndAssignees({
      id: result.taskId,
      title: req.body.title,
      assigneeIds: req.body.selectedUserIds || (req.body.assigneeId ? [req.body.assigneeId] : []),
      createdBy: req.user!.userId,
      orgId,
    }).catch(() => {});

    notifyTask.created(req.user!.userId, orgId, req.user!.userId, req.body.title, result.taskId).catch(() => {});

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
    const orgId = await requireOrgMembership(req.user!.userId);
    const oldTask = await Task.findById(req.params.id).select("assigneeId priority title").lean();
    await updateTask(req.params.id, req.user!.userId, req.body, req.query.scope as string | undefined);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      notifyTask.updated(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id).catch(() => {});
      if (oldTask?.priority && req.body.priority && oldTask.priority !== req.body.priority) {
        notifyTask.priorityChanged(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id, oldTask.priority, req.body.priority).catch(() => {});
      }
      if (oldTask?.assigneeId && oldTask.assigneeId !== task.assigneeId) {
        notifyTask.reassigned(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id).catch(() => {});
      }
    }

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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete tasks");
    const taskForNotification = await Task.findById(req.params.id).select("title assigneeId creatorId orgId").lean();
    await deleteTask(req.params.id, req.user!.userId, req.query.scope as string | undefined);

    if (taskForNotification) {
      createNotification({
        type: "system",
        userId: taskForNotification.assigneeId || taskForNotification.creatorId || "",
        orgId: taskForNotification.orgId,
        createdBy: req.user!.userId,
        title: "Task Deleted",
        message: `Task "${taskForNotification.title}" has been deleted`,
      }).catch(() => {});
    }

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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can batch update task status");
    const { taskIds, status } = req.body;
    if (!status) throw new AppError(400, "Status is required");
    if (!Array.isArray(taskIds) || taskIds.length === 0) throw new AppError(400, "taskIds must be a non-empty array");

    const orgId = await requireOrgMembership(req.user!.userId);
    const result = await batchUpdateStatus(taskIds, status, req.user!.userId);

    Task.find({ _id: { $in: taskIds } }).select("title assigneeId").lean().then(tasks => {
      (tasks as any[]).forEach(t => {
        if (t.assigneeId) {
          notifyTask.updated(t.assigneeId, orgId, req.user!.userId, t.title, t._id.toString()).catch(() => {});
        }
      });
    }).catch(() => {});

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
    const orgId = await requireOrgMembership(req.user!.userId);
    await updateTaskStatus(req.params.id, status, req.user!.userId);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      const notifyFn = status === "completed" ? notifyTask.completed
        : status === "in_progress" ? notifyTask.started
        : status === "hold" ? notifyTask.paused
        : status === "reopened" ? notifyTask.reopened
        : notifyTask.updated;
      notifyFn(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id).catch(() => {});
    }

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
    const orgId = await requireOrgMembership(req.user!.userId);
    await assignIndividualTask(req.params.id, assigneeId, req.user!.userId);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task) {
      notifyTask.assigned(assigneeId, orgId, req.user!.userId, task.title, req.params.id).catch(() => {});
    }

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
    const orgId = await requireOrgMembership(req.user!.userId);
    await submitForVerification(req.params.id, req.user!.userId);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task) {
      createNotification({
        type: "task_submitted",
        userId: task.creatorId || task.assigneeId || "",
        orgId,
        createdBy: req.user!.userId,
        title: "Task Submitted for Verification",
        message: `Task "${task.title}" has been submitted for verification`,
        link: `/alltasks?id=${req.params.id}`,
      }).catch(() => {});
    }

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
    const orgId = await requireOrgMembership(req.user!.userId);
    await approveTeamTask(req.params.id, req.user!.userId, req.body.note);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      notifyTask.approved(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id).catch(() => {});
    }

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
    const orgId = await requireOrgMembership(req.user!.userId);
    await rejectTeamTask(req.params.id, req.user!.userId, reason);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      notifyTask.rejected(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id, reason).catch(() => {});
    }

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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can publish tasks");
    const orgId = await requireOrgMembership(req.user!.userId);
    await publishCommonTask(req.params.id, req.user!.userId);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId selectedUserIds").lean();

    if (task) {
      const recipients = (task as any).selectedUserIds?.length
        ? (task as any).selectedUserIds
        : task.assigneeId ? [task.assigneeId] : [task.creatorId];
      recipients.forEach((uid: string) => {
        createNotification({
          type: "task_published",
          userId: uid,
          orgId,
          createdBy: req.user!.userId,
          title: "Task Published",
          message: `Task "${task.title}" has been published`,
          link: `/alltasks?id=${req.params.id}`,
        }).catch(() => {});
      });
    }

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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can activate tasks");
    const orgId = await requireOrgMembership(req.user!.userId);
    await activateUpcomingTask(req.params.id, req.user!.userId);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task) {
      createNotification({
        type: "task_activated",
        userId: task.assigneeId || task.creatorId || "",
        orgId,
        createdBy: req.user!.userId,
        title: "Task Activated",
        message: `Task "${task.title}" has been activated`,
        link: `/alltasks?id=${req.params.id}`,
      }).catch(() => {});
    }

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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can publish draft tasks");
    const { targetType, assigneeId, teamId, selectedUserIds, scheduledDate } = req.body;
    if (!targetType) throw new AppError(400, "targetType is required");
    const orgId = await requireOrgMembership(req.user!.userId);
    await publishDraft(req.params.id, req.user!.userId, targetType, {
      assigneeId, teamId, selectedUserIds,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
    });
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task) {
      const targetUserId = assigneeId || task.assigneeId || task.creatorId || "";
      createNotification({
        type: "draft_published",
        userId: targetUserId,
        orgId,
        createdBy: req.user!.userId,
        title: "Draft Published",
        message: `Draft "${task.title}" has been published as ${targetType}`,
        link: `/alltasks?id=${req.params.id}`,
      }).catch(() => {});
    }

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
