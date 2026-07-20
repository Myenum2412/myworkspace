import { Task } from "../lib/db/models/Task.js";
import { TeamMember } from "../lib/db/models/TeamMember.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import mongoose from "mongoose";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import {
  requireString, optionalString, requireEnum,
  TASK_STATUSES, TASK_PRIORITIES, TASK_TYPES,
} from "../lib/validate.js";
import type { TaskStatus, TaskPriority, TaskType } from "../lib/validate.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { logger } from "../lib/logger/index.js";
import { isAdminRole } from "../lib/rbac/index.js";
import {
  notifyTaskAssigned,
  notifyTaskUpdated,
  notifyTeamTaskSubmitted,
  notifyTeamTaskApproved,
  notifyTeamTaskRejected,
  notifyCommonTaskPublished,
  notifyUpcomingTaskActivated,
  notifyDraftPublished,
} from "../lib/notifications/index.js";
import {
  sendTaskAssigned,
  sendTaskUpdated,
  sendTaskStatusChanged,
  sendTaskCompleted,
  sendTeamTaskSubmitted,
  sendTeamTaskApproved,
  sendTeamTaskRejected,
} from "../lib/mail/index.js";
import { env } from "../config/env.js";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TaskListOptions {
  orgId: string;
  userId: string;
  page: number;
  limit: number;
  type?: string;
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
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// ─────────────────────────────────────────────
// Lifecycle maps — valid status transitions per type
// ─────────────────────────────────────────────

const INDIVIDUAL_TRANSITIONS: Record<string, string[]> = {
  draft: ["assigned"],
  assigned: ["pending", "hold", "cancelled"],
  pending: ["in_progress", "hold", "cancelled"],
  in_progress: ["completed", "hold", "cancelled"],
  completed: ["closed", "reopened"],
  closed: ["reopened"],
  hold: ["pending", "in_progress", "cancelled"],
  cancelled: ["reopened", "assigned"],
  rejected: ["pending", "in_progress"],
  reopened: ["in_progress"],
};

const TEAM_TRANSITIONS: Record<string, string[]> = {
  draft: ["pending"],
  pending: ["in_progress", "cancelled"],
  in_progress: ["submitted", "cancelled"],
  submitted: ["approved", "rejected"],
  approved: ["completed"],
  completed: ["closed", "reopened"],
  rejected: ["in_progress"],
  reopened: ["in_progress"],
  cancelled: [],
};

const COMMON_TRANSITIONS: Record<string, string[]> = {
  draft: ["published"],
  published: ["accepted", "completed", "in_progress"],
  in_progress: ["completed"],
  accepted: ["completed"],
  completed: ["closed"],
};

const UPCOMING_TRANSITIONS: Record<string, string[]> = {
  draft: ["scheduled"],
  scheduled: ["activated", "cancelled"],
  activated: ["in_progress", "completed"],
  in_progress: ["completed"],
  completed: ["closed"],
  cancelled: [],
};

const DRAFT_TRANSITIONS: Record<string, string[]> = {
  draft: ["assigned", "pending", "in_progress", "published", "scheduled"],
};

const TYPE_TRANSITIONS: Record<string, Record<string, string[]>> = {
  individual: INDIVIDUAL_TRANSITIONS,
  team: TEAM_TRANSITIONS,
  common: COMMON_TRANSITIONS,
  upcoming: UPCOMING_TRANSITIONS,
  draft: DRAFT_TRANSITIONS,
};

// Default initial status per type
const TYPE_INITIAL_STATUS: Record<string, string> = {
  individual: "draft",
  team: "draft",
  common: "draft",
  upcoming: "draft",
  draft: "draft",
};

// ─────────────────────────────────────────────
// Visibility helpers
// ─────────────────────────────────────────────

async function buildVisibilityFilter(orgId: string, userId: string, type?: string): Promise<Record<string, any>> {
  // Admins see everything
  const userRecord = await User.findOne({ id: userId }).lean();
  const isAdmin = isAdminRole(userRecord?.role || "");
  if (isAdmin) return { orgId };

  const userTeams = await TeamMember.find({ userId }).lean();
  const teamIds = userTeams.map(t => t.teamId);

  const conditions: Record<string, any>[] = [];

  // Individual tasks: user is assignee or creator
  conditions.push({ type: "individual", assigneeId: userId });
  conditions.push({ type: "individual", creatorId: userId });

  // Team tasks: user is a team member or team head
  if (teamIds.length > 0) {
    conditions.push({ type: "team", teamId: { $in: teamIds } });
  }

  // Common tasks: user is in selectedUserIds or is creator
  conditions.push({ type: "common", selectedUserIds: userId });
  conditions.push({ type: "common", creatorId: userId });

  // Upcoming: only creator sees upcoming
  conditions.push({ type: "upcoming", creatorId: userId });

  // Draft: only creator sees drafts
  conditions.push({ type: "draft", creatorId: userId });

  const filter: Record<string, any> = { orgId, $or: conditions };

  if (type) {
    filter.type = type;
  }

  return filter;
}

// ─────────────────────────────────────────────
// Lookup helpers
// ─────────────────────────────────────────────

async function lookupUser(id: string) {
  let u = await User.findOne({ id }).lean();
  if (!u) { try { u = await User.findById(id).lean(); } catch {} }
  return u;
}

async function getTeamHeadUserId(teamId: string): Promise<string | null> {
  const lead = await TeamMember.findOne({ teamId, role: "team_lead" }).lean();
  return lead?.userId || null;
}

// ─────────────────────────────────────────────
// Audit helper
// ─────────────────────────────────────────────

async function audit(orgId: string, userId: string, action: string, entityId: string, description: string, metadata?: string) {
  await recordAuditLog({ orgId, userId, createdBy: userId, action, entityType: "task", entityId, description, metadata });
}

// ─────────────────────────────────────────────
// Validate status transition
// ─────────────────────────────────────────────

function validateTransition(taskType: string, currentStatus: string, newStatus: string): void {
  const allowed = TYPE_TRANSITIONS[taskType]?.[currentStatus];
  if (!allowed) {
    throw new AppError(400, `No transitions allowed from status "${currentStatus}" for ${taskType} tasks`);
  }
  if (!allowed.includes(newStatus)) {
    throw new AppError(400, `Invalid status transition "${currentStatus}" → "${newStatus}" for ${taskType} tasks. Allowed: ${allowed.join(", ")}`);
  }
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────

export async function listTasks(options: TaskListOptions): Promise<TaskListResult> {
  const { orgId, userId, page, limit, status, priority, assigneeId, sortBy, sortOrder, afterId, type } = options;

  logger.debug({ page, limit, type, status, priority, assigneeId, sortBy, sortOrder, afterId, orgId, userId }, "listTasks");

  const allowedSortFields = ["createdAt", "dueDate", "priority", "status", "title"];
  const effectiveSortBy = allowedSortFields.includes(sortBy as string) ? (sortBy as string) : "createdAt";
  const effectiveSortOrder = sortOrder === "asc" ? 1 : -1;

  const match = await buildVisibilityFilter(orgId, userId, type);

  if (status) match.status = status;
  if (priority) match.priority = priority;
  if (assigneeId) match.assigneeId = assigneeId;
  if (typeof afterId === "string" && afterId) {
    match._id = { $lt: new mongoose.Types.ObjectId(afterId) };
  }

  const pipeline: any[] = [
    { $match: match },

    {
      $lookup: {
        from: "users",
        localField: "assigneeId",
        foreignField: "id",
        as: "assignee",
        pipeline: [{ $project: { _id: 1, name: 1, email: 1, image: 1 } }],
      },
    },
    { $unwind: { path: "$assignee", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "users",
        localField: "creatorId",
        foreignField: "id",
        as: "creator",
        pipeline: [{ $project: { _id: 1, name: 1, email: 1, image: 1 } }],
      },
    },
    { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "users",
        localField: "approvedBy",
        foreignField: "id",
        as: "approver",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
      },
    },
    { $unwind: { path: "$approver", preserveNullAndEmptyArrays: true } },

    {
      $lookup: {
        from: "teams",
        localField: "teamId",
        foreignField: "id",
        as: "team",
        pipeline: [{ $project: { _id: 1, name: 1 } }],
      },
    },
    { $unwind: { path: "$team", preserveNullAndEmptyArrays: true } },

    {
      $project: {
        _id: 1,
        title: 1,
        description: { $ifNull: ["$description", ""] },
        project: { $ifNull: ["$project", ""] },
        type: 1,
        status: 1,
        priority: 1,
        dueDate: 1,
        startDate: 1,
        scheduledDate: 1,
        activatedAt: 1,
        orgId: 1,
        teamId: 1,
        assigneeId: 1,
        creatorId: 1,
        selectedUserIds: 1,
        createdAt: 1,
        updatedAt: 1,
        isSaved: 1,
        isActive: 1,
        submittedAt: 1,
        approvedBy: 1,
        approvedAt: 1,
        approvalNote: 1,
        rejectedBy: 1,
        rejectedAt: 1,
        rejectionReason: 1,
        assignee: 1,
        creator: 1,
        approver: 1,
        team: 1,
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
    type: t.type,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate || null,
    startDate: t.startDate || null,
    scheduledDate: t.scheduledDate || null,
    activatedAt: t.activatedAt || null,
    assigneeId: t.assigneeId ? t.assigneeId.toString() : "",
    assigneeName: t.assignee?.name || "",
    assigneeAvatar: t.assignee?.image || "",
    creatorId: t.creatorId ? t.creatorId.toString() : "",
    creatorName: t.creator?.name || "",
    teamId: t.teamId || "",
    teamName: t.team?.name || "",
    selectedUserIds: t.selectedUserIds || [],
    submittedAt: t.submittedAt || null,
    approvedBy: t.approvedBy || "",
    approverName: t.approver?.name || "",
    approvedAt: t.approvedAt || null,
    approvalNote: t.approvalNote || "",
    rejectedBy: t.rejectedBy || "",
    rejectedAt: t.rejectedAt || null,
    rejectionReason: t.rejectionReason || "",
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    isSaved: t.isSaved ?? false,
    isActive: t.isActive ?? true,
  }));

  const total = result.totalCount[0]?.count || 0;
  logger.debug({ total, returned: data.length }, "listTasks result");

  return {
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// ─────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────

export async function createTask(data: {
  orgId: string;
  userId: string;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  assigneeId?: string;
  teamId?: string;
  project?: string;
  dueDate?: Date;
  startDate?: Date;
  scheduledDate?: Date;
  selectedUserIds?: string[];
  isSaved?: boolean;
  isActive?: boolean;
}): Promise<any> {
  const { orgId, userId } = data;
  const title = requireString(data.title, "title", { min: 1, max: 500 });
  const description = optionalString(data.description, "description", { max: 10_000 });

  const taskType: TaskType = data.type !== undefined
    ? requireEnum(data.type as string, TASK_TYPES as readonly string[] as any, "type") as TaskType
    : "individual";
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

  let startDate: Date | undefined;
  if (data.startDate) {
    const d = new Date(data.startDate);
    if (isNaN(d.getTime())) throw new AppError(400, "Invalid startDate", { startDate: "must be a valid date" });
    startDate = d;
  }

  let scheduledDate: Date | undefined;
  if (data.scheduledDate) {
    const d = new Date(data.scheduledDate);
    if (isNaN(d.getTime())) throw new AppError(400, "Invalid scheduledDate", { scheduledDate: "must be a valid date" });
    scheduledDate = d;
  }

  // Per-type validation
  if (taskType === "individual" && assigneeId) {
    const assigneeMember = await OrgMember.findOne({ userId: assigneeId, orgId }).lean();
    if (!assigneeMember) {
      const assigneeUser = await User.findOne({ id: assigneeId, orgId }).lean();
      if (!assigneeUser) {
        throw new AppError(403, "Cannot assign individual task to a user outside this workspace");
      }
    }
  }

  if (taskType === "team" && !teamId) {
    throw new AppError(400, "Team task requires a teamId");
  }

  if (taskType === "team" && teamId) {
    const teamMembers = await TeamMember.find({ teamId, orgId }).lean();
    if (teamMembers.length === 0) {
      throw new AppError(404, "Team not found in this workspace");
    }
  }

  if (taskType === "common" && data.selectedUserIds && data.selectedUserIds.length > 0) {
    // Validate all selected users belong to the org
    const members = await OrgMember.find({ userId: { $in: data.selectedUserIds }, orgId }).lean();
    if (members.length !== data.selectedUserIds.length) {
      throw new AppError(403, "One or more selected users are outside this workspace");
    }
  }

  if (taskType === "upcoming" && !scheduledDate && !dueDate) {
    throw new AppError(400, "Upcoming task requires a scheduledDate or dueDate");
  }

  const initialStatus = TYPE_INITIAL_STATUS[taskType];

  const resolvedAssigneeId = (taskType === "individual" && assigneeId) ? assigneeId : undefined;

  const task = await Task.create({
    orgId,
    type: taskType,
    teamId,
    assigneeId: resolvedAssigneeId,
    creatorId: userId,
    createdBy: userId,
    title,
    description,
    project,
    status: initialStatus,
    priority,
    dueDate,
    startDate,
    scheduledDate: taskType === "upcoming" ? (scheduledDate || dueDate) : undefined,
    selectedUserIds: taskType === "common" ? (data.selectedUserIds || []) : undefined,
    isSaved: data.isSaved,
    isActive: data.isActive,
  });

  await audit(orgId, userId, "task.created", task._id.toString(), `Task "${title}" created (${taskType})`);

  // Notifications based on type
  if (taskType === "individual" && resolvedAssigneeId && resolvedAssigneeId !== userId) {
    await notifyForIndividualAssignment(task, userId, orgId);
  }

  if (taskType === "team" && teamId) {
    await notifyTeamAssigned(task, userId, orgId);
  }

  if (taskType === "common") {
    await notifyCommonTaskCreated(task, userId, orgId);
  }

  return { taskId: task._id, type: taskType, status: initialStatus };
}

// ─────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────

export async function updateTask(id: string, userId: string, body: any, scope?: string): Promise<void> {
  const { title, status, priority, assigneeId, description, dueDate, project, isSaved, isActive,
          startDate, scheduledDate, selectedUserIds, rejectionReason, approvalNote } = body;
  const userOrgId = await requireOrgMembership(userId);

  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

  await checkModifyPermission(existing, userId, scope);

  // Validate status transition if status is changing
  if (status !== undefined && status !== existing.status) {
    validateTransition(existing.type, existing.status, status);
  }

  // Validate assignee changes for individual tasks
  if (assigneeId !== undefined && existing.type === "individual" && assigneeId !== existing.assigneeId?.toString()) {
    if (assigneeId !== userId) {
      // Only creator can reassign individual tasks
      if (existing.creatorId !== userId) {
        throw new AppError(403, "Only the task creator can reassign individual tasks");
      }
    }
    const assigneeMember = await OrgMember.findOne({ userId: assigneeId, orgId: userOrgId }).lean();
    if (!assigneeMember) {
      const assigneeUser = await User.findOne({ id: assigneeId, orgId: userOrgId }).lean();
      if (!assigneeUser) {
        throw new AppError(403, "Cannot assign task to a user outside this workspace");
      }
    }
  }

  // Validate selectedUserIds for common tasks
  if (selectedUserIds !== undefined && existing.type === "common") {
    const members = await OrgMember.find({ userId: { $in: selectedUserIds }, orgId: userOrgId }).lean();
    if (members.length !== selectedUserIds.length) {
      throw new AppError(403, "One or more selected users are outside this workspace");
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
  if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
  if (scheduledDate !== undefined) updates.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
  if (selectedUserIds !== undefined) updates.selectedUserIds = selectedUserIds;
  if (isSaved !== undefined) updates.isSaved = isSaved;
  if (isActive !== undefined) updates.isActive = isActive;
  if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason;
  if (approvalNote !== undefined) updates.approvalNote = approvalNote;

  const updated = await Task.findByIdAndUpdate(id, updates, { new: true }).lean();

  const changeDesc = status ? `status changed to ${status}` : title ? "title updated" : "updated";
  await audit(userOrgId, userId, "task.updated", id, `Task updated: ${changeDesc}`);

  // Notifications
  const newAssigneeId = assigneeId !== undefined ? assigneeId : existing.assigneeId?.toString();
  const assigneeChanged = assigneeId !== undefined && assigneeId !== existing.assigneeId?.toString();

  if (assigneeChanged && existing.type === "individual" && newAssigneeId && newAssigneeId !== userId) {
    await notifyForIndividualAssignment(
      { _id: id, title: updated?.title || existing.title || "", project: updated?.project || existing.project || "",
        priority: updated?.priority || existing.priority || "medium", dueDate: updated?.dueDate || existing.dueDate,
        assigneeId: newAssigneeId, type: "individual" },
      userId, userOrgId,
    );
  }

  // Notify assignee of other updates
  if (!assigneeChanged && existing.type === "individual" && existing.assigneeId && existing.assigneeId !== userId) {
    await notifyAssigneeOfUpdate(existing, updated, userId, userOrgId, status);
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

export async function deleteTask(id: string, userId: string, scope?: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to delete this task");

  await checkModifyPermission(existing, userId, scope);

  // Drafts: only creator can delete
  if (existing.type === "draft" && existing.creatorId !== userId) {
    throw new AppError(403, "Only the creator can delete drafts");
  }

  await Task.findByIdAndDelete(id);
  await audit(userOrgId, userId, "task.deleted", id, `Task "${existing.title}" deleted`);
}

// ─────────────────────────────────────────────
// STATUS TRANSITIONS (per-type)
// ─────────────────────────────────────────────

export async function updateTaskStatus(id: string, status: TaskStatus, userId: string): Promise<void> {
  if (!status) throw new AppError(400, "Status is required");
  const userOrgId = await requireOrgMembership(userId);

  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized to modify this task");

  validateTransition(existing.type, existing.status, status);

  await Task.findByIdAndUpdate(id, { status });

  await audit(userOrgId, userId, "task.status_changed", id, `Status changed to ${status}`);

  if (existing.assigneeId && existing.assigneeId !== userId) {
    const [updater, assigneeUser] = await Promise.all([
      User.findOne({ id: userId }).lean().catch(() => null),
      lookupUser(existing.assigneeId),
    ]);
    if (assigneeUser?.email) {
      sendTaskStatusChanged(
        assigneeUser.email,
        assigneeUser.name || assigneeUser.email,
        existing.title || "",
        existing.project || "",
        updater?.name || "A user",
        existing.status || "",
        status,
        `${env.APP_URL}/alltasks?id=${id}`,
      ).catch((err) => logger.error({ err }, "Failed to send task status email"));
    }
  }
}

export async function batchUpdateStatus(taskIds: string[], status: TaskStatus, userId: string): Promise<{ matched: number; modified: number }> {
  if (!status) throw new AppError(400, "Status is required");
  if (!Array.isArray(taskIds) || taskIds.length === 0) throw new AppError(400, "taskIds must be a non-empty array");

  const userOrgId = await requireOrgMembership(userId);
  const tasks = await Task.find({ _id: { $in: taskIds } }, { _id: 1, orgId: 1, status: 1, type: 1 }).lean();
  const unauthorized = tasks.some((t) => t.orgId.toString() !== userOrgId);
  if (unauthorized) throw new AppError(403, "Not authorized to modify one or more tasks");

  for (const t of tasks) {
    validateTransition(t.type, t.status, status);
  }

  const bulkOps = tasks.map((t) => ({
    updateOne: { filter: { _id: t._id }, update: { $set: { status } } },
  }));

  const result = await Task.bulkWrite(bulkOps);
  return { matched: result.matchedCount, modified: result.modifiedCount };
}

// ─────────────────────────────────────────────
// INDIVIDUAL TASK WORKFLOW
// ─────────────────────────────────────────────

export async function assignIndividualTask(id: string, assigneeId: string, userId: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "individual") throw new AppError(400, "Not an individual task");

  // Only creator can assign
  if (existing.creatorId !== userId) {
    throw new AppError(403, "Only the creator can assign this task");
  }

  validateTransition(existing.type, existing.status, "assigned");

  const assigneeMember = await OrgMember.findOne({ userId: assigneeId, orgId: userOrgId }).lean();
  if (!assigneeMember) {
    throw new AppError(403, "Cannot assign to a user outside this workspace");
  }

  await Task.findByIdAndUpdate(id, { assigneeId, status: "assigned" });

  await audit(userOrgId, userId, "task.assigned", id, `Assigned to user ${assigneeId}`);

  // Notify assignee
  const [assigneeUser, creatorUser] = await Promise.all([
    lookupUser(assigneeId),
    User.findOne({ id: userId }).lean().catch(() => null),
  ]);

  notifyTaskAssigned(
    { id, title: existing.title || "" },
    assigneeId,
    creatorUser?.name || "A user",
    userOrgId,
  ).catch((err) => logger.error({ err }, "Failed to send assignment notification"));

  if (assigneeUser?.email) {
    sendTaskAssigned(
      assigneeUser.email, assigneeUser.name || assigneeUser.email,
      existing.title || "", existing.project || "",
      creatorUser?.name || "A user",
      existing.dueDate ? new Date(existing.dueDate).toISOString().split("T")[0] : "No due date",
      existing.priority || "medium",
      `${env.APP_URL}/alltasks?id=${id}`,
    ).catch((err) => logger.error({ err }, "Failed to send assignment email"));
  }
}

// ─────────────────────────────────────────────
// TEAM TASK WORKFLOW
// ─────────────────────────────────────────────

export async function submitForVerification(id: string, userId: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "team") throw new AppError(400, "Not a team task");

  validateTransition(existing.type, existing.status, "submitted");

  // Verify user is a team member
  const member = await TeamMember.findOne({ userId, teamId: existing.teamId }).lean();
  if (!member) {
    throw new AppError(403, "Only team members can submit for verification");
  }

  await Task.findByIdAndUpdate(id, { status: "submitted", submittedAt: new Date() });
  await audit(userOrgId, userId, "task.submitted", id, "Submitted for verification");

  // Notify team head
  const submitterUser = await User.findOne({ id: userId }).lean().catch(() => null);
  if (!existing.teamId) return;
  const headUserId = await getTeamHeadUserId(existing.teamId);

  if (headUserId) {
    notifyTeamTaskSubmitted(
      { id, title: existing.title || "" },
      headUserId,
      submitterUser?.name || "A team member",
      userOrgId,
    ).catch((err) => logger.error({ err }, "Failed to notify team head"));
  }
}

export async function approveTeamTask(id: string, userId: string, note?: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "team") throw new AppError(400, "Not a team task");

  validateTransition(existing.type, existing.status, "approved");

  // Verify user is the team head
  if (!existing.teamId) throw new AppError(400, "Team task has no team assigned");
  const headUserId = await getTeamHeadUserId(existing.teamId);
  if (headUserId && headUserId !== userId) {
    // Check admin override
    const userRecord = await User.findOne({ id: userId }).lean();
    const isAdmin = isAdminRole(userRecord?.role || "");
    if (!isAdmin) {
      throw new AppError(403, "Only the team head can approve team tasks");
    }
  }

  await Task.findByIdAndUpdate(id, {
    status: "approved", approvedBy: userId, approvedAt: new Date(), approvalNote: note || "",
  });
  await audit(userOrgId, userId, "task.approved", id, `Task approved${note ? `: ${note}` : ""}`);

  // Notify team members
  const approverUser = await User.findOne({ id: userId }).lean().catch(() => null);
  const teamMembers = await TeamMember.find({ teamId: existing.teamId }).lean();
  for (const member of teamMembers) {
    if (member.userId === userId) continue;
    notifyTeamTaskApproved(
      { id, title: existing.title || "" },
      member.userId,
      approverUser?.name || "Team head",
      userOrgId,
    ).catch(() => {});
  }
}

export async function rejectTeamTask(id: string, userId: string, reason: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "team") throw new AppError(400, "Not a team task");

  validateTransition(existing.type, existing.status, "rejected");

  if (!reason) throw new AppError(400, "Rejection reason is required");

  // Verify user is the team head
  if (!existing.teamId) throw new AppError(400, "Team task has no team assigned");
  const headUserId = await getTeamHeadUserId(existing.teamId);
  if (headUserId && headUserId !== userId) {
    const userRecord = await User.findOne({ id: userId }).lean();
    const isAdmin = isAdminRole(userRecord?.role || "");
    if (!isAdmin) {
      throw new AppError(403, "Only the team head can reject team tasks");
    }
  }

  await Task.findByIdAndUpdate(id, {
    status: "rejected", rejectedBy: userId, rejectedAt: new Date(), rejectionReason: reason,
  });
  await audit(userOrgId, userId, "task.rejected", id, `Task rejected: ${reason}`);

  // Notify team members
  const rejectorUser = await User.findOne({ id: userId }).lean().catch(() => null);
  const teamMembers = await TeamMember.find({ teamId: existing.teamId }).lean();
  for (const member of teamMembers) {
    if (member.userId === userId) continue;
    notifyTeamTaskRejected(
      { id, title: existing.title || "" },
      member.userId,
      rejectorUser?.name || "Team head",
      userOrgId,
      reason,
    ).catch(() => {});
  }
}

// ─────────────────────────────────────────────
// COMMON TASK WORKFLOW
// ─────────────────────────────────────────────

export async function publishCommonTask(id: string, userId: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "common") throw new AppError(400, "Not a common task");

  validateTransition(existing.type, existing.status, "published");

  await Task.findByIdAndUpdate(id, { status: "published" });
  await audit(userOrgId, userId, "task.published", id, "Common task published");

  // Notify selected users
  const publisher = await User.findOne({ id: userId }).lean().catch(() => null);
  if (existing.selectedUserIds && existing.selectedUserIds.length > 0) {
    for (const uid of existing.selectedUserIds) {
      if (uid === userId) continue;
      notifyCommonTaskPublished(
        { id, title: existing.title || "" },
        uid,
        publisher?.name || "A user",
        userOrgId,
      ).catch(() => {});
    }
  }
}

// ─────────────────────────────────────────────
// UPCOMING TASK WORKFLOW
// ─────────────────────────────────────────────

export async function activateUpcomingTask(id: string, userId: string): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "upcoming") throw new AppError(400, "Not an upcoming task");

  validateTransition(existing.type, existing.status, "activated");

  await Task.findByIdAndUpdate(id, { status: "activated", activatedAt: new Date() });
  await audit(userOrgId, userId, "task.activated", id, "Upcoming task activated");

  // Notify creator/assignee
  const activator = await User.findOne({ id: userId }).lean().catch(() => null);
  notifyUpcomingTaskActivated(
    { id, title: existing.title || "" },
    existing.assigneeId || existing.creatorId,
    activator?.name || "System",
    userOrgId,
  ).catch((err) => logger.error({ err }, "Failed to notify activation"));
}

// ─────────────────────────────────────────────
// DRAFT WORKFLOW
// ─────────────────────────────────────────────

export async function publishDraft(id: string, userId: string, targetType: TaskType, targetData?: {
  assigneeId?: string;
  teamId?: string;
  selectedUserIds?: string[];
  scheduledDate?: Date;
}): Promise<void> {
  const userOrgId = await requireOrgMembership(userId);
  const existing = await Task.findById(id).lean();
  if (!existing) throw new AppError(404, "Task not found");
  if (existing.orgId.toString() !== userOrgId) throw new AppError(403, "Not authorized");
  if (existing.type !== "draft") throw new AppError(400, "Not a draft task");
  if (existing.creatorId !== userId) throw new AppError(403, "Only the creator can publish drafts");

  const validTargets: TaskType[] = ["individual", "team", "common", "upcoming"];
  if (!validTargets.includes(targetType)) {
    throw new AppError(400, `Cannot publish draft as type "${targetType}"`);
  }

  // Validate target-type requirements
  if (targetType === "individual" && !targetData?.assigneeId) {
    throw new AppError(400, "assigneeId required to publish as individual task");
  }
  if (targetType === "team" && !targetData?.teamId) {
    throw new AppError(400, "teamId required to publish as team task");
  }
  if (targetType === "upcoming" && !targetData?.scheduledDate && !existing.dueDate) {
    throw new AppError(400, "scheduledDate required to publish as upcoming task");
  }

  const initialStatus = TYPE_INITIAL_STATUS[targetType];

  const updates: Record<string, any> = {
    type: targetType,
    status: targetType === "individual" ? "assigned" : initialStatus,
  };
  if (targetData?.assigneeId) updates.assigneeId = targetData.assigneeId;
  if (targetData?.teamId) updates.teamId = targetData.teamId;
  if (targetData?.selectedUserIds) updates.selectedUserIds = targetData.selectedUserIds;
  if (targetData?.scheduledDate) updates.scheduledDate = targetData.scheduledDate;

  await Task.findByIdAndUpdate(id, updates);
  await audit(userOrgId, userId, "task.published", id, `Draft published as ${targetType} task`);

  const publisher = await User.findOne({ id: userId }).lean().catch(() => null);
  notifyDraftPublished(
    { id, title: existing.title || "" },
    userId,
    publisher?.name || "System",
    userOrgId,
    targetType,
  ).catch((err) => logger.error({ err }, "Failed to notify draft publish"));
}

// ─────────────────────────────────────────────
// SYSTEM: auto-activate upcoming tasks
// ─────────────────────────────────────────────

export async function autoActivateScheduledTasks(): Promise<number> {
  const now = new Date();
  const tasksToActivate = await Task.find({
    type: "upcoming",
    status: "scheduled",
    scheduledDate: { $lte: now },
  }).lean();

  let activated = 0;
  for (const task of tasksToActivate) {
    await Task.findByIdAndUpdate(task._id, { status: "activated", activatedAt: now });
    await audit(task.orgId, "system", "task.activated", task._id.toString(), "Auto-activated scheduled task");
    notifyUpcomingTaskActivated(
      { id: task._id.toString(), title: task.title || "" },
      task.assigneeId || task.creatorId,
      "System",
      task.orgId,
    ).catch(() => {});
    activated++;
  }

  return activated;
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

async function checkModifyPermission(task: any, userId: string, scope?: string): Promise<void> {
  if (scope === "staffs") {
    const userTeams = await TeamMember.find({ userId }).lean();
    const teamIds = userTeams.map(t => t.teamId);
    const isOwnTask = task.assigneeId?.toString() === userId;
    const isTeamTask = task.teamId && teamIds.includes(task.teamId);

    if (!isOwnTask && !isTeamTask && task.creatorId !== userId) {
      throw new AppError(403, "Not authorized to modify this task");
    }
  }
}

async function notifyForIndividualAssignment(task: any, userId: string, orgId: string): Promise<void> {
  const [assigneeUser, creatorUser] = await Promise.all([
    lookupUser(task.assigneeId),
    User.findOne({ id: userId }).lean().catch(() => null),
  ]);

  notifyTaskAssigned(
    { id: task._id.toString(), title: task.title || "" },
    task.assigneeId,
    creatorUser?.name || "A user",
    orgId,
  ).catch((err) => logger.error({ err }, "Failed to send assignment notification"));

  if (assigneeUser?.email) {
    sendTaskAssigned(
      assigneeUser.email, assigneeUser.name || assigneeUser.email,
      task.title || "", task.project || "",
      creatorUser?.name || "A user",
      task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "No due date",
      task.priority || "medium",
      `${env.APP_URL}/alltasks?id=${task._id}`,
    ).catch((err) => logger.error({ err }, "Failed to send assignment email"));
  }
}

async function notifyTeamAssigned(task: any, userId: string, orgId: string): Promise<void> {
  const creatorUser = await User.findOne({ id: userId }).lean().catch(() => null);
  const teamMembers = await TeamMember.find({ teamId: task.teamId }).lean();
  const headUserId = await getTeamHeadUserId(task.teamId);

  for (const member of teamMembers) {
    if (member.userId === userId) continue;
    notifyTaskAssigned(
      { id: task._id.toString(), title: task.title || "" },
      member.userId,
      creatorUser?.name || "A user",
      orgId,
      { teamName: task.teamId },
    ).catch(() => {});
  }

  // Notify team head
  if (headUserId && headUserId !== userId) {
    notifyTaskAssigned(
      { id: task._id.toString(), title: task.title || "" },
      headUserId,
      creatorUser?.name || "A user",
      orgId,
      { teamName: task.teamId },
    ).catch(() => {});
  }
}

async function notifyCommonTaskCreated(task: any, userId: string, orgId: string): Promise<void> {
  const creatorUser = await User.findOne({ id: userId }).lean().catch(() => null);
  if (task.selectedUserIds && task.selectedUserIds.length > 0) {
    for (const uid of task.selectedUserIds) {
      if (uid === userId) continue;
      notifyTaskAssigned(
        { id: task._id.toString(), title: task.title || "" },
        uid,
        creatorUser?.name || "A user",
        orgId,
        { taskType: "common" },
      ).catch(() => {});
    }
  }
}

async function notifyAssigneeOfUpdate(existing: any, updated: any, userId: string, userOrgId: string, status?: string): Promise<void> {
  const [updaterUser, assigneeUser] = await Promise.all([
    User.findOne({ id: userId }).lean().catch(() => null),
    lookupUser(existing.assigneeId),
  ]);
  const changes = [status ? `status changed to ${status}` : ""].filter(Boolean).join(", ");

  notifyTaskUpdated(
    { id: existing._id.toString(), title: updated?.title || existing.title || "" },
    existing.assigneeId,
    updaterUser?.name || "A user",
    userOrgId,
    changes || undefined,
  ).catch((err) => logger.error({ err }, "Failed to send update notification"));

  if (assigneeUser?.email) {
    sendTaskUpdated(
      assigneeUser.email, assigneeUser.name || assigneeUser.email,
      updated?.title || existing.title || "", updated?.project || existing.project || "",
      updaterUser?.name || "A user", changes || "task updated",
      `${env.APP_URL}/alltasks?id=${existing._id}`,
    ).catch((err) => logger.error({ err }, "Failed to send update email"));
  }
}
