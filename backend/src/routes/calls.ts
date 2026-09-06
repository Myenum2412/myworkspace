// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import {
  type CallActor,
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

export default async function plugin(fastify: FastifyInstance) {
async function actorOf(req: AuthRequest): Promise<CallActor> {
  const userId = req.user?.userId;
  const orgId = req.user?.orgId;
  if (!userId || !orgId) {
    const err = new Error("Unauthorized") as Error & { statusCode?: number };
    err.statusCode = 401;
    throw err;
  }
  return {
    userId,
    orgId,
    name: await resolveUserName(userId),
    role: req.user?.role,
  };
}

fastify.get("/", authenticate, async (req: AuthRequest, reply: any) => {
  if (!req.user?.orgId || !req.user?.userId) {
    reply.send(401).json({ success: false, error: "Unauthorized" });
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
  reply.send(201).json({ success: true, data: call });
});

fastify.get("/", authenticate, async (req: AuthRequest, reply: any) => {
  if (!req.user?.orgId || !req.user?.userId) {
    reply.send(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const scope = (req.query.scope as string | undefined) || "all";
  const calls = await listCalls({
    orgId: req.user.orgId,
    actorUserId: req.user.userId,
    scope: scope as "active" | "scheduled" | "history" | "all",
  });
  reply.send({ success: true, data: calls });
});

fastify.get("/history", authenticate, async (req: AuthRequest, reply: any) => {
  if (!req.user?.orgId || !req.user?.userId) {
    reply.send(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  const calls = await getCallHistory(req.user.orgId, req.user.userId, limit);
  reply.send({ success: true, data: calls });
});

fastify.get("/:id", authenticate, async (req: AuthRequest, reply: any) => {
  const call = await getCall(req.params.id);
  reply.send({ success: true, data: call });
});

fastify.get("/:id/join", authenticate, async (req: AuthRequest, reply: any) => {
  const data = await joinCall(req.params.id, await actorOf(req));
  reply.send({ success: true, data });
});

fastify.get("/:id/leave", authenticate, async (req: AuthRequest, reply: any) => {
  const data = await leaveCall(req.params.id, await actorOf(req));
  reply.send({ success: true, data });
});

fastify.get("/:id/end", authenticate, async (req: AuthRequest, reply: any) => {
  const data = await endCall(req.params.id, await actorOf(req));
  reply.send({ success: true, data });
});

fastify.get("/:id/cancel", authenticate, async (req: AuthRequest, reply: any) => {
  const data = await cancelCall(req.params.id, await actorOf(req));
  reply.send({ success: true, data });
});

fastify.get("/:id/hand-raise", authenticate, async (req: AuthRequest, reply: any) => {
  const data = await toggleHandRaise(req.params.id, await actorOf(req));
  reply.send({ success: true, data });
});

fastify.get("/:id/state", authenticate, async (req: AuthRequest, reply: any) => {
  const { audio, video, screen, muted } = req.body ?? {};
  const data = await updateSelfState(req.params.id, await actorOf(req), {
    audio,
    video,
    screen,
    muted,
  });
  reply.send({ success: true, data });
});

fastify.get("/:id/moderate", authenticate, async (req: AuthRequest, reply: any) => {
  const { action, targetUserId } = req.body ?? {};
  const data = await moderatorControls(req.params.id, await actorOf(req), action, targetUserId);
  reply.send({ success: true, data });
});

fastify.get("/:id/chat", authenticate, async (req: AuthRequest, reply: any) => {
  const { text } = req.body ?? {};
  if (!text) {
    reply.send(400).json({ success: false, error: "text is required" });
    return;
  }
  const data = await sendChat(req.params.id, await actorOf(req), String(text));
  reply.send({ success: true, data });
});

fastify.get("/:id", authenticate, async (req: AuthRequest, reply: any) => {
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
    reply.send(400).json({ success: false, error: "Nothing to update" });
    return;
  }
  reply.send({ success: true, data });
});
}
