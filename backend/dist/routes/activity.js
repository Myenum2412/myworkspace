import { Router } from "express";
import { ActivityLog } from "../lib/db/models/ActivityLog";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/error";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
    const orgId = req.query.orgId || "";
    if (!orgId)
        throw new AppError(400, "orgId is required");
    const logs = await ActivityLog.find({ orgId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    res.json({ success: true, data: logs });
});
export default router;
