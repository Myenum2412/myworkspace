import { Router } from "express";
import { Task } from "../lib/db/models/Task.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
const router = Router();
router.use(authenticate);
// GET /?page=1&limit=20&status=&priority=&assigneeId=&sortBy=createdAt&sortOrder=desc
router.get("/", async (req, res) => {
    try {
        const userOrgId = await requireOrgMembership(req.user.userId);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const { status, priority, assigneeId, sortBy, sortOrder } = req.query;
        const allowedSortFields = ["createdAt", "dueDate", "priority", "status", "title"];
        const effectiveSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
        const effectiveSortOrder = sortOrder === "asc" ? 1 : -1;
        // Build match stage
        const match = { orgId: userOrgId };
        if (status)
            match.status = status;
        if (priority)
            match.priority = priority;
        if (assigneeId)
            match.assigneeId = assigneeId;
        const pipeline = [
            { $match: match },
            // Lookup assignee from users collection
            {
                $lookup: {
                    from: "users",
                    localField: "assigneeId",
                    foreignField: "_id",
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
                    foreignField: "_id",
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
        const data = result.data.map((t) => ({
            _id: t._id.toString(),
            title: t.title,
            description: t.description || "",
            project: t.project || "",
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate || null,
            assigneeId: t.assigneeId ? t.assigneeId.toString() : "",
            assignee: t.assignee
                ? {
                    _id: t.assignee._id.toString(),
                    name: t.assignee.name || "",
                    email: t.assignee.email || "",
                    image: t.assignee.image || "",
                }
                : null,
            creatorId: t.creatorId ? t.creatorId.toString() : "",
            creator: t.creator
                ? {
                    _id: t.creator._id.toString(),
                    name: t.creator.name || "",
                    email: t.creator.email || "",
                    image: t.creator.image || "",
                }
                : null,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));
        const total = result.totalCount[0]?.count || 0;
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
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to fetch tasks");
    }
});
// POST /
router.post("/", async (req, res) => {
    try {
        const { orgId, title, description, priority, assigneeId, teamId, dueDate, project } = req.body;
        if (!title)
            throw new AppError(400, "Title is required");
        if (!orgId)
            throw new AppError(400, "orgId is required");
        const task = await Task.create({
            orgId,
            teamId: teamId || undefined,
            assigneeId: assigneeId || req.user.userId,
            creatorId: req.user.userId,
            title,
            description: description || undefined,
            project: project || undefined,
            priority: priority || "medium",
            dueDate: dueDate ? new Date(dueDate) : undefined,
        });
        await ActivityLog.create({
            orgId,
            userId: req.user.userId,
            action: "task.created",
            entityType: "task",
            entityId: task._id.toString(),
            description: `Task "${title}" created`,
        });
        res.status(201).json({ success: true, data: { taskId: task._id } });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to create task");
    }
});
// PUT /:id
router.put("/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { title, status, priority, assigneeId, description, dueDate, project } = req.body;
        const userOrgId = await requireOrgMembership(req.user.userId);
        const existing = await Task.findById(id).lean();
        if (!existing)
            throw new AppError(404, "Task not found");
        if (existing.orgId.toString() !== userOrgId)
            throw new AppError(403, "Not authorized to modify this task");
        const updates = {};
        if (title !== undefined)
            updates.title = title;
        if (status !== undefined)
            updates.status = status;
        if (priority !== undefined)
            updates.priority = priority;
        if (assigneeId !== undefined)
            updates.assigneeId = assigneeId;
        if (description !== undefined)
            updates.description = description;
        if (project !== undefined)
            updates.project = project;
        if (dueDate !== undefined)
            updates.dueDate = dueDate ? new Date(dueDate) : null;
        await Task.findByIdAndUpdate(id, updates);
        await ActivityLog.create({
            orgId: existing.orgId,
            userId: req.user.userId,
            action: "task.updated",
            entityType: "task",
            entityId: id,
            description: `Task updated: ${status ? `status changed to ${status}` : title ? "title updated" : ""}`,
        });
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to update task");
    }
});
// DELETE /:id
router.delete("/:id", async (req, res) => {
    try {
        const userOrgId = await requireOrgMembership(req.user.userId);
        const existing = await Task.findById(req.params.id).lean();
        if (!existing)
            throw new AppError(404, "Task not found");
        if (existing.orgId.toString() !== userOrgId)
            throw new AppError(403, "Not authorized to delete this task");
        await Task.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to delete task");
    }
});
// PATCH /batch/status  — bulk update status for multiple tasks
// Body: { taskIds: string[], status: string }
// NOTE: Must be before /:id/status so "batch" is not captured as :id
router.patch("/batch/status", async (req, res) => {
    try {
        const { taskIds, status } = req.body;
        if (!status)
            throw new AppError(400, "Status is required");
        if (!Array.isArray(taskIds) || taskIds.length === 0)
            throw new AppError(400, "taskIds must be a non-empty array");
        const userOrgId = await requireOrgMembership(req.user.userId);
        // Verify all tasks belong to the user's org
        const tasks = await Task.find({ _id: { $in: taskIds } }, { _id: 1, orgId: 1 }).lean();
        const unauthorized = tasks.some((t) => t.orgId.toString() !== userOrgId);
        if (unauthorized)
            throw new AppError(403, "Not authorized to modify one or more tasks");
        const bulkOps = tasks.map((t) => ({
            updateOne: {
                filter: { _id: t._id },
                update: { $set: { status } },
            },
        }));
        const result = await Task.bulkWrite(bulkOps);
        res.json({
            success: true,
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount,
            },
        });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to batch update tasks");
    }
});
// PATCH /:id/status
router.patch("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        if (!status)
            throw new AppError(400, "Status is required");
        const userOrgId = await requireOrgMembership(req.user.userId);
        const existing = await Task.findById(req.params.id).lean();
        if (!existing)
            throw new AppError(404, "Task not found");
        if (existing.orgId.toString() !== userOrgId)
            throw new AppError(403, "Not authorized to modify this task");
        await Task.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to update task status");
    }
});
export default router;
