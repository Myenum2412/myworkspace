import { Router } from "express";
import { Task } from "../lib/db/models/Task";
import { ActivityLog } from "../lib/db/models/ActivityLog";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/error";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
    const orgId = req.query.orgId || "";
    const filter = {};
    if (orgId)
        filter.orgId = orgId;
    const tasks = await Task.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: tasks });
});
router.post("/", async (req, res) => {
    const { orgId, title, description, priority, assigneeId, teamId, dueDate } = req.body;
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
});
router.put("/:id", async (req, res) => {
    const id = req.params.id;
    const { title, status, priority, assigneeId, description, dueDate } = req.body;
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
    if (dueDate !== undefined)
        updates.dueDate = dueDate ? new Date(dueDate) : null;
    await Task.findByIdAndUpdate(id, updates);
    await ActivityLog.create({
        orgId: "demo-org-id",
        userId: req.user.userId,
        action: "task.updated",
        entityType: "task",
        entityId: id,
        description: `Task updated: ${status ? `status changed to ${status}` : title ? `title updated` : ""}`,
    });
    res.json({ success: true });
});
router.delete("/:id", async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true });
});
router.patch("/:id/status", async (req, res) => {
    const { status } = req.body;
    if (!status)
        throw new AppError(400, "Status is required");
    await Task.findByIdAndUpdate(req.params.id, { status });
    res.json({ success: true });
});
export default router;
