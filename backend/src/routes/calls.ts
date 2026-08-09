import { type Response, Router } from "express";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import {
  cancelCall,
  createCall,
  endCall,
  getCall,
  getCallHistory,
  joinCall,
  leaveCall,
  listCalls,
  moderatorControls,
  rescheduleCall,
  resolveUserName,
  sendChat,
  toggleHandRaise,
  updateSelfState,
} from "../services/call.service.js";

const router = Router();

async function actorOf(req: AuthRequest) {
  return {
    userId: req.user?.userId,
    orgId: req.user?.orgId ?? "",
    name: await resolveUserName(req.user?.userId),
    role: req.user?.role,
  };
}

router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user?.orgId || !req.user?.userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const { channelId, type, name, media, invitees, scheduledAt } = req.body ?? {};
  const call = await createCall({
    orgId: req.user.orgId,
    actor: await actorOf(req),
    channelId: channelId || undefined,
    type: type || "dm",
    name,
    media: media === "audio" ? "audio" : "video",
    invitees: Array.isArray(invitees) ? invitees : [],
    scheduledAt,
  });
  res.status(201).json({ success: true, data: call });
});

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user?.orgId || !req.user?.userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const scope = (req.query.scope as string | undefined) || "all";
  const calls = await listCalls({
    orgId: req.user.orgId,
    actorUserId: req.user.userId,
    scope: scope as "active" | "scheduled" | "history" | "all",
  });
  res.json({ success: true, data: calls });
});

router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  if (!req.user?.orgId || !req.user?.userId) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const calls = await getCallHistory(req.user.orgId, req.user.userId, limit);
  res.json({ success: true, data: calls });
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const call = await getCall(req.params.id);
  res.json({ success: true, data: call });
});

router.post("/:id/join", authenticate, async (req: AuthRequest, res: Response) => {
  const data = await joinCall(req.params.id, await actorOf(req));
  res.json({ success: true, data });
});

router.post("/:id/leave", authenticate, async (req: AuthRequest, res: Response) => {
  const data = await leaveCall(req.params.id, await actorOf(req));
  res.json({ success: true, data });
});

router.post("/:id/end", authenticate, async (req: AuthRequest, res: Response) => {
  const data = await endCall(req.params.id, await actorOf(req));
  res.json({ success: true, data });
});

router.post("/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  const data = await cancelCall(req.params.id, await actorOf(req));
  res.json({ success: true, data });
});

router.post("/:id/hand-raise", authenticate, async (req: AuthRequest, res: Response) => {
  const data = await toggleHandRaise(req.params.id, await actorOf(req));
  res.json({ success: true, data });
});

router.post("/:id/state", authenticate, async (req: AuthRequest, res: Response) => {
  const { audio, video, screen, muted } = req.body ?? {};
  const data = await updateSelfState(req.params.id, await actorOf(req), {
    audio,
    video,
    screen,
    muted,
  });
  res.json({ success: true, data });
});

router.post("/:id/moderate", authenticate, async (req: AuthRequest, res: Response) => {
  const { action, targetUserId } = req.body ?? {};
  const data = await moderatorControls(req.params.id, await actorOf(req), action, targetUserId);
  res.json({ success: true, data });
});

router.post("/:id/chat", authenticate, async (req: AuthRequest, res: Response) => {
  const { text } = req.body ?? {};
  if (!text) {
    res.status(400).json({ success: false, error: "text is required" });
    return;
  }
  const data = await sendChat(req.params.id, await actorOf(req), String(text));
  res.json({ success: true, data });
});

router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { scheduledAt, name } = req.body ?? {};
  let data: unknown;
  if (scheduledAt) {
    data = await rescheduleCall(req.params.id, await actorOf(req), String(scheduledAt));
  } else if (name) {
    const { Call } = await import("../lib/db/models/Call.js");
    data = await Call.findOneAndUpdate(
      { id: req.params.id },
      { $set: { name: String(name) } },
      { new: true },
    );
  } else {
    res.status(400).json({ success: false, error: "Nothing to update" });
    return;
  }
  res.json({ success: true, data });
});

export default router;
