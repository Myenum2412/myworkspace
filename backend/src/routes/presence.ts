import { type Response, Router } from "express";
import { presenceRegistry } from "../lib/presence/index.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user?.orgId || !req.user?.userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const orgId = req.user.orgId;
  const entries = presenceRegistry.getOrg(orgId);
  const presence: Record<string, unknown> = {};
  for (const entry of entries) {
    presence[entry.userId] = {
      status: entry.status,
      lastActiveAt: entry.lastActiveAt,
    };
  }
  res.json({
    success: true,
    data: {
      orgId,
      presence,
    },
  });
});

router.patch("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user?.orgId || !req.user?.userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const { status } = req.body ?? {};
  if (!["online", "idle", "busy", "in-call"].includes(status)) {
    res.status(400).json({ success: false, error: "Invalid status" });
    return;
  }
  // The socket is the source of truth for live presence; this endpoint is a
  // fallback for REST-only clients.
  const entry = presenceRegistry.get(req.user.userId);
  if (entry) {
    presenceRegistry.status(req.user.userId, status);
  }
  res.json({ success: true, data: { userId: req.user.userId, status } });
});

export default router;
