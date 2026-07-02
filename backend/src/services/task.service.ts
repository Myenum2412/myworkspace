import { Task } from "../lib/db/models/Task.js";
import { TeamMember } from "../lib/db/models/TeamMember.js";
import { User } from "../lib/db/models/User.js";
import mongoose from "mongoose";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { requireString, optionalString, requireEnum, TASK_STATUSES, TASK_PRIORITIES } from "../lib/validate.js";
import type { TaskStatus, TaskPriority } from "../lib/validate.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { logger } from "../lib/logger/index.js";

export interface TaskListOptions {
  orgId: string;
  userId: string;
  page: number;
  limit: number;
  status?: string;
  priority?: string;
  assigneeId?: string;
  sortBy?: string;
  sortOrder?: string;
  scope?: string;
  afterId?: string;
}

export interface TaskListResult {
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function listTasks(options: TaskListOptions): Promise<TaskListResult> {
  const { orgId, userId, page, limit, status, priority, assigneeId, sortBy, sortOrder, scope, afterId } = options;

  logger.debug({ page, limit, status, priority, assigneeId, sortBy, sortOrder, scope, afterId, orgId, userId }, "listTasks");

  const allowedSortFields = ["createdAt", "dueDate", "priority", "status", "title"];
  const effectiveSortBy = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : "createdAt";
  const effectiveSortOrder = sortOrder === "asc" ? 1 : -1;

  const match: Record<string, any> = { orgId };
  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (assigneeId) match.assigneeId = assigneeId;
  if (typeof afterId === "string" && afterId) {
    match._id = { $lt: new mongoose.Types.ObjectId(afterId) };
  }

  if (scope === "staff" || scope === "member") {
    const userTeams = await TeamMember.find({ userId }).lean();
    const teamIds = userTeams.map(t => t.teamId);
    const orConditions: Record<string, any>[] = [
      { assigneeId: userId },
    ];
    if (teamIds.length > 0) {
      orConditions.push({ teamId: { $in: teamIds } });
    }
    match.$or = orConditions;
  }

  logger.debug({ match }, "listTasks match");

  const pipeline: any[] = [
    { $match: match },

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
    logger.debug({ total, returned: data.length }, "listTasks result");

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function createTask(data: {
  orgId: string;
  userId: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  teamId?: string;
  project?: string;
  dueDate?: Date;
}): Promise<any> {
  const { orgId, userId } = data;
  const title = requireString(data.title, "title", { min: 1, max: 500 });
  const description = optionalString(data.description, "description", { max: 10_000 });
  const priority = data.priority !== undefined
    ? requireEnum(data.priority, TASK_PRIORITIES, "priority")
    : "medium";
  const assigneeId = optionalString(data.assigneeId, "assigneeId", { max: 100 });
  const teamId = optionalString(data.teamId, "teamId", { max: 100 });
  const project = optionalString(data.project, "project", { max: 500 });
  let dueDate: Date | undefined;
  if (data.dueDate) {
    const d = new Date(data.dueDate);
    if (isNaN(d.getTime())) throw new AppError(400, "Invalid dueDate", { dueDate: "must be a valid date" });
    dueDate = d;
  }

  const task = await Task.create({
    orgId,
    teamId,
    assigneeId: assigneeId || userId,
    creatorId: userId,
    createdBy: userId,
    title,
    description,
    project,
    priority,
    dueDate,
  });

  await recordAuditLog({
    orgId,
    userId,
    createdBy: userId,
    action: "task.created",
    entityType: "task",
    entityId: task._id.toString(),
    description: `Task "${title}" created`,
  });

  const [assigneeUser, creatorUser] = await Promise.all([
    User.findOne({ id: task.assigneeId || userId }).lean(),
    User.findOne({ id: userId }).lean(),
  ]);

  socketIOManager.emitToOrg(orgId, "task:created", {
    id: task._id.toString(),
    _id: task._id.toString(),
    orgId,
    title,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId?.toString() || userId,
    assigneeName: assigneeUser?.name || "",
    assigneeAvatar: assigneeUser?.image || "",
    creatorId: userId,
    creatorName: creatorUser?.name || "",
    dueDate: task.dueDate || null,
    createdAt: task.createdAt,
  });

  return { taskId: task._id };
}

export async function updateTask(id: string, userId: string, body: any, scope?: string): Promise<void> {
  const { title, status, priority, assigneeId, description, dueDate, project } = body;
  const userOrgId = await requireOrgMembership(userId);

  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

  if (scope === "staff" || scope === "member") {
    const userTeams = await TeamMember.find({ userId }).lean();
    const teamIds = userTeams.map(t => t.teamId);
    const isOwnTask = existing.assigneeId?.toString() === userId;
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

  const updated = await Task.findByIdAndUpdate(id, updates, { new: true }).lean();

  await recordAuditLog({
    orgId: existing.orgId,
    userId,
    createdBy: userId,
    action: "task.updated",
    entityType: "task",
    entityId: id,
    description: `Task updated: ${status ? `status changed to ${status}` : title ? "title updated" : ""}`,
  });

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
}

export async function deleteTask(id: string, userId: string, scope?: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to delete this task");

  if (scope === "staff" || scope === "member") {
    const userTeams = await TeamMember.find({ userId }).lean();
    const teamIds = userTeams.map(t => t.teamId);
    const isOwnTask = existing.assigneeId?.toString() === userId;
    const isTeamTask = existing.teamId && teamIds.includes(existing.teamId);
    if (!isOwnTask && !isTeamTask) {
      throw new AppError(403, "Not authorized to delete this task");
    }
  }

  await Task.findByIdAndDelete(id);

  await recordAuditLog({
    orgId: existing.orgId,
    userId,
    createdBy: userId,
    action: "task.deleted",
    entityType: "task",
    entityId: id,
    description: `Task deleted`,
  });

  socketIOManager.emitToOrg(existing.orgId.toString(), "task:deleted", {
    id,
    orgId: existing.orgId.toString(),
  });
}

export async function batchUpdateStatus(taskIds: string[], status: TaskStatus, userId: string): Promise<{ matched: number; modified: number }> {
  if (!status) throw new AppError(400, "Status is required");
  if (!Array.isArray(taskIds) || taskIds.length === 0) throw new AppError(400, "taskIds must be a non-empty array");

  const userOrgId = await requireOrgMembership(userId);

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

  socketIOManager.emitToOrg(userOrgId, "task:batch-updated", {
    ids: tasks.map((t) => t._id.toString()),
    status,
  });

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  };
}

export async function updateTaskStatus(id: string, status: TaskStatus, userId: string): Promise<void> {
  if (!status) throw new AppError(400, "Status is required");
  const userOrgId = await requireOrgMembership(userId);

  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

  await Task.findByIdAndUpdate(id, { status });

  socketIOManager.emitToOrg(userOrgId, "task:updated", {
    id,
    orgId: userOrgId,
    status,
    updatedAt: new Date(),
  });
}
