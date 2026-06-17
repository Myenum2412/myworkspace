import { Router } from "express";
import { User } from "../lib/db/models/User.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
const router = Router();
router.use(authenticate);
router.get("/status", async (req, res) => {
    const userId = req.query.userId || req.user.userId;
    const user = await User.findById(userId).lean();
    if (!user) {
        res.json({ success: true, data: { status: "offline" } });
        return;
    }
    res.json({ success: true, data: { status: user.status } });
});
router.put("/status", async (req, res) => {
    const { status } = req.body;
    const userId = req.body.userId || req.user.userId;
    if (!status)
        throw new AppError(400, "Status is required");
    await User.findByIdAndUpdate(userId, { status });
    res.json({ success: true });
});
export default router;
