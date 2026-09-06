// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { Task } from "../lib/db/models/Task.js";
import { logger } from "../lib/logger/index.js";
import {
  notifyTask,
  notifyTaskCreatedAndAssignees,
} from "../lib/notifications/notification-wiring.js";
import { requireOrgMembership, requireOrgMembershipFromRequest } from "../lib/org-utils.js";
import { canCreateTask, isAdminRole } from "../lib/rbac/index.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { createNotification } from "../services/notification.service.js";
import {
  activateUpcomingTask,
  approveTeamTask,
  assignIndividualTask,
  autoActivateScheduledTasks,
  batchUpdateStatus,
  createTask,
  deleteTask,
  listTasks,
  publishCommonTask,
  rejectTeamTask,
  submitForVerification,
  updateTask,
  updateTaskStatus,
} from "../services/task.service.js";

export default async function plugin(fastify: FastifyInstance) {
// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
fastify.get("/", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembershipFromRequest(req);
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

    reply.send({ success: true, data: result.data, pagination: result.pagination });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Could not load tasks");
  }
});

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────
fastify.get("/", async (req: AuthRequest, reply: any) => {
  try {
    if (!canCreateTask(req.user!.role))
      throw new AppError(403, "Only admins and staff can create tasks");
    const orgId = await requireOrgMembershipFromRequest(req);

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
      assigneeIds: req.body.assigneeIds,
      assignmentMode: req.body.assignmentMode,
      isSaved: req.body.isSaved,
      isActive: req.body.isActive,
      repeatType: req.body.repeatType,
      repeatStartDate: req.body.repeatStartDate ? new Date(req.body.repeatStartDate) : undefined,
      repeatEndDate: req.body.repeatEndDate ? new Date(req.body.repeatEndDate) : undefined,
    });

    notifyTaskCreatedAndAssignees({
      id: result.taskId,
      title: req.body.title,
      assigneeIds: req.body.selectedUserIds || (req.body.assigneeId ? [req.body.assigneeId] : []),
      createdBy: req.user!.userId,
      orgId,
    }).catch(() => {});

    notifyTask
      .created(req.user!.userId, orgId, req.user!.userId, req.body.title, result.taskId)
      .catch(() => {});

    reply.send(201).json({
      success: true,
      data: { taskId: result.taskId, type: result.type, status: result.status },
    });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to create task");
  }
});

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────
fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembershipFromRequest(req);
    const oldTask = await Task.findById(req.params.id).select("assigneeId priority title").lean();
    await updateTask(
      req.params.id,
      req.user!.userId,
      req.body,
      req.query.scope as string | undefined,
    );
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      notifyTask
        .updated(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id)
        .catch(() => {});
      if (oldTask?.priority && req.body.priority && oldTask.priority !== req.body.priority) {
        notifyTask
          .priorityChanged(
            task.assigneeId,
            orgId,
            req.user!.userId,
            task.title,
            req.params.id,
            oldTask.priority,
            req.body.priority,
          )
          .catch(() => {});
      }
      if (oldTask?.assigneeId && oldTask.assigneeId !== task.assigneeId) {
        notifyTask
          .reassigned(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id)
          .catch(() => {});
      }
    }

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to update task");
  }
});

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  try {
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete tasks");
    const taskForNotification = await Task.findById(req.params.id)
      .select("title assigneeId creatorId orgId")
      .lean();
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

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to delete task");
  }
});

// ─────────────────────────────────────────────
// BATCH STATUS UPDATE
// ─────────────────────────────────────────────
fastify.get("/batch/status", async (req: AuthRequest, reply: any) => {
  try {
    if (!isAdminRole(req.user!.role))
      throw new AppError(403, "Only admins can batch update task status");
    const { taskIds, status } = req.body;
    if (!status) throw new AppError(400, "Status is required");
    if (!Array.isArray(taskIds) || taskIds.length === 0)
      throw new AppError(400, "taskIds must be a non-empty array");

    const orgId = await requireOrgMembershipFromRequest(req);
    const result = await batchUpdateStatus(taskIds, status, req.user!.userId);

    Task.find({ _id: { $in: taskIds } })
      .select("title assigneeId")
      .lean()
      .then((tasks) => {
        (tasks as any[]).forEach((t) => {
          if (t.assigneeId) {
            notifyTask
              .updated(t.assigneeId, orgId, req.user!.userId, t.title, t._id.toString())
              .catch(() => {});
          }
        });
      })
      .catch(() => {});

    reply.send({ success: true, data: { matched: result.matched, modified: result.modified } });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to batch update tasks");
  }
});

// ─────────────────────────────────────────────
// SINGLE STATUS UPDATE
// ─────────────────────────────────────────────
fastify.get("/:id/status", async (req: AuthRequest, reply: any) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError(400, "Status is required");
    const orgId = await requireOrgMembershipFromRequest(req);
    await updateTaskStatus(req.params.id, status, req.user!.userId);
    const fullTask = await Task.findById(req.params.id).lean();

    if (fullTask?.assigneeId) {
      const notifyFn =
        status === "completed"
          ? notifyTask.completed
          : status === "in_progress"
            ? notifyTask.started
            : status === "hold"
              ? notifyTask.paused
              : status === "reopened"
                ? notifyTask.reopened
                : notifyTask.updated;
      notifyFn(fullTask.assigneeId, orgId, req.user!.userId, fullTask.title, req.params.id).catch(
        () => {},
      );
    }

    reply.send({ success: true, data: fullTask });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to update task status");
  }
});

// ─────────────────────────────────────────────
// INDIVIDUAL: Assign task to a user
// ─────────────────────────────────────────────
fastify.get("/:id/assign", async (req: AuthRequest, reply: any) => {
  try {
    const { assigneeId } = req.body;
    if (!assigneeId) throw new AppError(400, "assigneeId is required");
    const orgId = await requireOrgMembershipFromRequest(req);
    await assignIndividualTask(req.params.id, assigneeId, req.user!.userId);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task) {
      notifyTask
        .assigned(assigneeId, orgId, req.user!.userId, task.title, req.params.id)
        .catch(() => {});
    }

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to assign task");
  }
});

// ─────────────────────────────────────────────
// TEAM: Submit for verification
// ─────────────────────────────────────────────
fastify.get("/:id/submit-verification", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembershipFromRequest(req);
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

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to submit for verification");
  }
});

// ─────────────────────────────────────────────
// TEAM: Approve
// ─────────────────────────────────────────────
fastify.get("/:id/approve", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembershipFromRequest(req);
    await approveTeamTask(req.params.id, req.user!.userId, req.body.note);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      notifyTask
        .approved(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id)
        .catch(() => {});
    }

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to approve task");
  }
});

// ─────────────────────────────────────────────
// TEAM: Reject
// ─────────────────────────────────────────────
fastify.get("/:id/reject", async (req: AuthRequest, reply: any) => {
  try {
    const { reason } = req.body;
    if (!reason) throw new AppError(400, "Rejection reason is required");
    const orgId = await requireOrgMembershipFromRequest(req);
    await rejectTeamTask(req.params.id, req.user!.userId, reason);
    const task = await Task.findById(req.params.id).select("title assigneeId creatorId").lean();

    if (task?.assigneeId) {
      notifyTask
        .rejected(task.assigneeId, orgId, req.user!.userId, task.title, req.params.id, reason)
        .catch(() => {});
    }

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to reject task");
  }
});

// ─────────────────────────────────────────────
// COMMON: Publish
// ─────────────────────────────────────────────
fastify.get("/:id/publish", async (req: AuthRequest, reply: any) => {
  try {
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can publish tasks");
    const orgId = await requireOrgMembershipFromRequest(req);
    await publishCommonTask(req.params.id, req.user!.userId);
    const task = await Task.findById(req.params.id)
      .select("title assigneeId creatorId selectedUserIds")
      .lean();

    if (task) {
      const recipients = (task as any).selectedUserIds?.length
        ? (task as any).selectedUserIds
        : task.assigneeId
          ? [task.assigneeId]
          : [task.creatorId];
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

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to publish task");
  }
});

// ─────────────────────────────────────────────
// UPCOMING: Activate
// ─────────────────────────────────────────────
fastify.get("/:id/activate", async (req: AuthRequest, reply: any) => {
  try {
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can activate tasks");
    const orgId = await requireOrgMembershipFromRequest(req);
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

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError || err.name === "ValidationError") throw err;
    throw new AppError(500, err.message || "Failed to activate task");
  }
});

// ─────────────────────────────────────────────
// SYSTEM: Auto-activate scheduled upcoming tasks
// ─────────────────────────────────────────────
fastify.get("/system/auto-activate", async (_req: AuthRequest, reply: any) => {
  try {
    const count = await autoActivateScheduledTasks();
    reply.send({ success: true, data: { activated: count } });
  } catch (err: any) {
    throw new AppError(500, err.message || "Failed to auto-activate tasks");
  }
});
}
