import { Router, Response } from "express";
import mongoose from "mongoose";
import { Task } from "../lib/db/models/Task.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { TeamMember } from "../lib/db/models/TeamMember.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { requireString, requireEnum, optionalString, TASK_STATUSES, TASK_PRIORITIES } from "../lib/validate.js";

const router = Router();

router.use(authenticate);

// GET /?page=1&limit=20&status=&priority=&assigneeId=&sortBy=createdAt&sortOrder=desc
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    console.log(`[TASKS] ========== GET / START ==========`);
    console.log(`[TASKS] Request query:`, req.query);
    console.log(`[TASKS] req.orgId (from middleware): ${req.orgId || 'NOT SET'}`);
    console.log(`[TASKS] req.user:`, JSON.stringify(req.user));
    
    const userOrgId = await requireOrgMembership(req.user!.userId);
    console.log(`[TASKS] requireOrgMembership returned: ${userOrgId}`);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { status, priority, assigneeId, sortBy, sortOrder, scope, afterId } = req.query;

    const allowedSortFields = ["createdAt", "dueDate", "priority", "status", "title"];
    const effectiveSortBy = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : "createdAt";
    const effectiveSortOrder = sortOrder === "asc" ? 1 : -1;

    // Build match stage
    const match: Record<string, any> = { orgId: userOrgId };
    if (status) match.status = status;
    if (priority) match.priority = priority;
    if (assigneeId) match.assigneeId = assigneeId;
    // Cursor pagination: fetch rows strictly after this _id. Keeps deep-page
    // reads O(limit) instead of O(skip+limit) which skip() degrades to.
    if (typeof afterId === "string" && afterId) {
      match._id = { $lt: new mongoose.Types.ObjectId(afterId) };
    }

    // Staff scope: only show tasks assigned to the user or their teams
    if (scope === "staff" || scope === "member") {
      const userTeams = await TeamMember.find({ userId: req.user!.userId }).lean();
      const teamIds = userTeams.map(t => t.teamId);
      const orConditions: Record<string, any>[] = [
        { assigneeId: req.user!.userId },
      ];
      if (teamIds.length > 0) {
        orConditions.push({ teamId: { $in: teamIds } });
      }
      match.$or = orConditions;
    }
    
    console.log(`[TASKS] Match query:`, JSON.stringify(match));

    const pipeline: any[] = [
      { $match: match },

      // Lookup assignee from users collection
      {
        $lookup: {
          from: "users",
          localField: "assigneeId",
          foreignField: "id",
          as: "assignee",
          pipeline: [
            { $project: { _id: 1, name: 1, email: 1, image: 1 } },
          ],
        },
      },
      { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },

      // Lookup creator from users collection
      {
        $lookup: {
          from: "users",
          localField: "creatorId",
          foreignField: "id",
          as: "creator",
          pipeline: [
            { $project: { _id: 1, name: 1, email: 1, image: 1 } },
          ],
        },
      },
      { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },

      // Project only needed fields
      {
        $project: {
          _id: 1,
          title: 1,
          description: { $ifNull: ["$description", ""] },
          project: { $ifNull: ["$project", ""] },
          status: 1,
          priority: 1,
          dueDate: 1,
          orgId: 1,
          teamId: 1,
          assigneeId: 1,
          creatorId: 1,
          createdAt: 1,
          updatedAt: 1,
          assignee: 1,
          creator: 1,
        },
      },

      // Facet for data + total count
      {
        $facet: {
          data: [
            { $sort: { [effectiveSortBy]: effectiveSortOrder } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await Task.aggregate(pipeline);
    const data = result.data.map((t: any) => ({
      id: t._id.toString(),
      _id: t._id.toString(),
      title: t.title,
      description: t.description || "",
      project: t.project || "",
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate || null,
      assigneeId: t.assigneeId ? t.assigneeId.toString() : "",
      assigneeName: t.assignee?.name || "",
      assigneeAvatar: t.assignee?.image || "",
      creatorId: t.creatorId ? t.creatorId.toString() : "",
      creatorName: t.creator?.name || "",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    const total = result.totalCount[0]?.count || 0;
    console.log(`[TASKS] Total count: ${total}, Returned: ${data.length}`);
    console.log(`[TASKS] First task sample:`, data[0] ? { _id: data[0]._id, title: data[0].title, status: data[0].status } : 'none');
    console.log(`[TASKS] ========== GET / END ==========`);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch tasks");
  }
});

// POST /
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const title = requireString(req.body.title, "title", { min: 1, max: 500 });
    const description = optionalString(req.body.description, "description", { max: 10_000 });
    const priority = req.body.priority !== undefined
      ? requireEnum(req.body.priority, TASK_PRIORITIES, "priority")
      : "medium";
    const assigneeId = optionalString(req.body.assigneeId, "assigneeId", { max: 100 });
    const teamId = optionalString(req.body.teamId, "teamId", { max: 100 });
    const project = optionalString(req.body.project, "project", { max: 500 });
    let dueDate: Date | undefined;
    if (req.body.dueDate) {
      const d = new Date(req.body.dueDate);
      if (isNaN(d.getTime())) throw new AppError(400, "Invalid dueDate", { dueDate: "must be a valid date" });
      dueDate = d;
    }
    // Fan-out in parallel: write the task, write the activity log. Independent
    // so a sequential await here was pure latency tax. ActivityLog needs the
    // task id so it is written after — but the task create is the long pole,
    // so we kick off a detached log write once we have the id.
    const task = await Task.create({
      orgId,
      teamId,
      assigneeId: assigneeId || req.user!.userId,
      creatorId: req.user!.userId,
      createdBy: req.user!.userId,
      title,
      description,
      project,
      priority,
      dueDate,
    });

    // Fire-and-forget the activity log — the user-facing path (response + socket)
    // does not depend on it. Removes one blocking await from the hot path.
    void ActivityLog.create({
      orgId,
      userId: req.user!.userId,
      createdBy: req.user!.userId,
      action: "task.created",
      entityType: "task",
      entityId: task._id.toString(),
      description: `Task "${title}" created`,
    });

    const [assigneeUser, creatorUser] = await Promise.all([
      import("../lib/db/models/User.js").then(m => m.User.findOne({ id: task.assigneeId || req.user!.userId }).lean()),
      import("../lib/db/models/User.js").then(m => m.User.findOne({ id: req.user!.userId }).lean()),
    ]);

    // Emit the delta to the org room only — other clients patch local state,
    // no full refetch. Includes assignee so the right user gets a notification cue.
    socketIOManager.emitToOrg(orgId, "task:created", {
      id: task._id.toString(),
      _id: task._id.toString(),
      orgId,
      title,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId?.toString() || req.user!.userId,
      assigneeName: assigneeUser?.name || "",
      assigneeAvatar: assigneeUser?.image || "",
      creatorId: req.user!.userId,
      creatorName: creatorUser?.name || "",
      dueDate: task.dueDate || null,
      createdAt: task.createdAt,
    });

    res.status(201).json({ success: true, data: { taskId: task._id } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to create task");
  }
});

// PUT /:id
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { title, status, priority, assigneeId, description, dueDate, project } = req.body;
    const userOrgId = await requireOrgMembership(req.user!.userId);

    const existing = await Task.findById(id).lean();
    if (!existing) throw new AppError(404, "Task not found");
    if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

    // Staff users can only update tasks assigned to them or their teams
    const updateScope = req.query.scope as string;
    if (updateScope === "staff" || updateScope === "member") {
      const userTeams = await TeamMember.find({ userId: req.user!.userId }).lean();
      const teamIds = userTeams.map(t => t.teamId);
      const isOwnTask = existing.assigneeId?.toString() === req.user!.userId;
      const isTeamTask = existing.teamId && teamIds.includes(existing.teamId);
      if (!isOwnTask && !isTeamTask) {
        throw new AppError(403, "Not authorized to modify this task");
      }
    }

    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (assigneeId !== undefined) updates.assigneeId = assigneeId;
    if (description !== undefined) updates.description = description;
    if (project !== undefined) updates.project = project;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

    // Update + log in parallel. The event payload carries just the changed
    // scalar fields, not the whole document — clients merge into local state.
    const [updated] = await Promise.all([
      Task.findByIdAndUpdate(id, updates, { new: true }).lean(),
      ActivityLog.create({
        orgId: existing.orgId,
        userId: req.user!.userId,
        createdBy: req.user!.userId,
        action: "task.updated",
        entityType: "task",
        entityId: id,
        description: `Task updated: ${status ? `status changed to ${status}` : title ? "title updated" : ""}`,
      }),
    ]);

    socketIOManager.emitToOrg(existing.orgId.toString(), "task:updated", {
      id,
      _id: id,
      orgId: existing.orgId.toString(),
      title: updated?.title,
      status: updated?.status,
      priority: updated?.priority,
      assigneeId: updated?.assigneeId?.toString(),
      updatedAt: updated?.updatedAt ?? new Date(),
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update task");
  }
});

// DELETE /:id
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userOrgId = await requireOrgMembership(req.user!.userId);
    const existing = await Task.findById(req.params.id).lean();
    if (!existing) throw new AppError(404, "Task not found");
    if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to delete this task");

    const deleteScope = req.query.scope as string;
    if (deleteScope === "staff" || deleteScope === "member") {
      const userTeams = await TeamMember.find({ userId: req.user!.userId }).lean();
      const teamIds = userTeams.map(t => t.teamId);
      const isOwnTask = existing.assigneeId?.toString() === req.user!.userId;
      const isTeamTask = existing.teamId && teamIds.includes(existing.teamId);
      if (!isOwnTask && !isTeamTask) {
        throw new AppError(403, "Not authorized to delete this task");
      }
    }

    await Promise.all([
      Task.findByIdAndDelete(req.params.id),
      ActivityLog.create({
        orgId: existing.orgId,
        userId: req.user!.userId,
        createdBy: req.user!.userId,
        action: "task.deleted",
        entityType: "task",
        entityId: req.params.id,
        description: `Task deleted`,
      }),
    ]);

    socketIOManager.emitToOrg(existing.orgId.toString(), "task:deleted", {
      id: req.params.id,
      orgId: existing.orgId.toString(),
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to delete task");
  }
});

// PATCH /batch/status  — bulk update status for multiple tasks
// Body: { taskIds: string[], status: string }
// NOTE: Must be before /:id/status so "batch" is not captured as :id
router.patch("/batch/status", async (req: AuthRequest, res: Response) => {
  try {
    const { taskIds, status } = req.body;
    if (!status) throw new AppError(400, "Status is required");
    if (!Array.isArray(taskIds) || taskIds.length === 0) throw new AppError(400, "taskIds must be a non-empty array");

    const userOrgId = await requireOrgMembership(req.user!.userId);

    // Verify all tasks belong to the user's org
    const tasks = await Task.find({ _id: { $in: taskIds } }, { _id: 1, orgId: 1 }).lean();
    const unauthorized = tasks.some((t) => t.orgId.toString() !== userOrgId);
    if (unauthorized) throw new AppError(403, "Not authorized to modify one or more tasks");

    const bulkOps = tasks.map((t) => ({
      updateOne: {
        filter: { _id: t._id },
        update: { $set: { status } },
      },
    }));

    const result = await Task.bulkWrite(bulkOps);

    // Delta only: which ids changed and to what status.
    socketIOManager.emitToOrg(userOrgId, "task:batch-updated", {
      ids: tasks.map((t) => t._id.toString()),
      status,
    });

    res.json({
      success: true,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to batch update tasks");
  }
});

// PATCH /:id/status
router.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!status) throw new AppError(400, "Status is required");
    const userOrgId = await requireOrgMembership(req.user!.userId);

    const existing = await Task.findById(req.params.id).lean();
    if (!existing) throw new AppError(404, "Task not found");
    if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

    await Task.findByIdAndUpdate(req.params.id, { status });

    socketIOManager.emitToOrg(userOrgId, "task:updated", {
      id: req.params.id,
      orgId: userOrgId,
      status,
      updatedAt: new Date(),
    });

    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update task status");
  }
});

export default router;
