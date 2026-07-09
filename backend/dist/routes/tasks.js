import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { listTasks, createTask, updateTask, deleteTask, batchUpdateStatus, updateTaskStatus, } from "../services/task.service.js";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
    try {
        const orgId = await requireOrgMembership(req.user.userId);
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const result = await listTasks({
            orgId,
            userId: req.user.userId,
            page,
            limit,
            status: req.query.status,
            priority: req.query.priority,
            assigneeId: req.query.assigneeId,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder,
            scope: req.query.scope,
            afterId: req.query.afterId,
        });
        res.json({ success: true, data: result.data, pagination: result.pagination });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to fetch tasks");
    }
});
router.post("/", async (req, res) => {
    try {
        const orgId = await requireOrgMembership(req.user.userId);
        const result = await createTask({
            orgId,
            userId: req.user.userId,
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
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to create task");
    }
});
router.put("/:id", async (req, res) => {
    try {
        await updateTask(req.params.id, req.user.userId, req.body, req.query.scope);
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to update task");
    }
});
router.delete("/:id", async (req, res) => {
    try {
        await deleteTask(req.params.id, req.user.userId, req.query.scope);
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to delete task");
    }
});
router.patch("/batch/status", async (req, res) => {
    try {
        const { taskIds, status } = req.body;
        if (!status)
            throw new AppError(400, "Status is required");
        if (!Array.isArray(taskIds) || taskIds.length === 0)
            throw new AppError(400, "taskIds must be a non-empty array");
        const result = await batchUpdateStatus(taskIds, status, req.user.userId);
        res.json({ success: true, data: { matched: result.matched, modified: result.modified } });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to batch update tasks");
    }
});
router.patch("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        if (!status)
            throw new AppError(400, "Status is required");
        await updateTaskStatus(req.params.id, status, req.user.userId);
        res.json({ success: true });
    }
    catch (err) {
        if (err instanceof AppError)
            throw err;
        throw new AppError(500, err.message || "Failed to update task status");
    }
});
export default router;
