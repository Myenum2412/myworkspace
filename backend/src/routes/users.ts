// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { User } from "../lib/db/models/User.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

export default async function plugin(fastify: FastifyInstance) {
fastify.get("/status", async (req: AuthRequest, reply: any) => {
  const user = await User.findById(req.user!.userId).select("status").lean();
  if (!user) {
    reply.send({ success: true, data: { status: "offline" } });
    return;
  }
  reply.send({ success: true, data: { status: user.status } });
});

fastify.get("/status", async (req: AuthRequest, reply: any) => {
  const { status } = req.body;
  if (!status) throw new AppError(400, "Status is required");

  await User.findByIdAndUpdate(req.user!.userId, { status });
  reply.send({ success: true });
});
}
