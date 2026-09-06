// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { presenceRegistry } from "../lib/presence/index.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";

export default async function plugin(fastify: FastifyInstance) {
fastify.get("/", authenticate, async (req: AuthRequest, reply: any) => {
  if (!req.user?.orgId || !req.user?.userId) {
    reply.send(401).json({ success: false, error: "Unauthorized" });
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
  reply.send({
    success: true,
    data: {
      orgId,
      presence,
    },
  });
});

fastify.get("/", authenticate, async (req: AuthRequest, reply: any) => {
  if (!req.user?.orgId || !req.user?.userId) {
    reply.send(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  const { status } = req.body ?? {};
  if (!["online", "idle", "busy", "in-call"].includes(status)) {
    reply.send(400).json({ success: false, error: "Invalid status" });
    return;
  }
  // The socket is the source of truth for live presence; this endpoint is a
  // fallback for REST-only clients.
  const entry = presenceRegistry.get(req.user.userId);
  if (entry) {
    presenceRegistry.status(req.user.userId, status);
  }
  reply.send({ success: true, data: { userId: req.user.userId, status } });
});
}
