import { Router } from "express";
import { Task } from "../lib/db/models/Task.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
const router = Router();
router.use(authenticate);
router.get("/metrics", async (req, res) => {
    const orgId = req.query.orgId || "";
    if (!orgId)
        throw new AppError(400, "orgId is required");
    const [totalTasks, completedTasks, inProgressTasks, overdueTasks, activeMembers, recentActivity,] = await Promise.all([
        Task.countDocuments({ orgId }),
        Task.countDocuments({ orgId, status: "done" }),
        Task.countDocuments({ orgId, status: "in_progress" }),
        Task.countDocuments({ orgId, dueDate: { $lt: new Date() }, status: { $ne: "done" } }),
        OrgMember.countDocuments({ orgId }),
        ActivityLog.countDocuments({
            orgId,
            createdAt: { $gt: new Date(Date.now() - 86400000) },
        }),
    ]);
    res.json({
        success: true,
        data: {
            totalTasks,
            completedTasks,
            inProgressTasks,
            overdueTasks,
            activeMembers,
            recentActivity,
        },
    });
});
export default router;
