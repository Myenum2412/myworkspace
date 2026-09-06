// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { Settings } from "../lib/db/models/Settings.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { processEvent } from "../services/notification-engine.service.js";

export default async function plugin(fastify: FastifyInstance) {
fastify.get("/", async (req: AuthRequest, reply: any) => {
  const orgId = (req.query.orgId as string) || (await requireOrgMembership(req.user!.userId));
  let settings = await Settings.findOne({ orgId })
    .select("orgId general team notifications")
    .lean();
  if (!settings) {
    const created = await Settings.create({ orgId });
    settings = created.toObject() as any;
  }
  const { _id, ...rest } = settings as any;
  reply.send({ success: true, data: rest });
});

fastify.get("/", async (req: AuthRequest, reply: any) => {
  const orgId = req.body.orgId || (await requireOrgMembership(req.user!.userId));
  const { general, team, notifications } = req.body;

  const update: Record<string, unknown> = {};
  if (general) update.general = general;
  if (team) update.team = team;
  if (notifications) update.notifications = notifications;

  const settings = await Settings.findOneAndUpdate(
    { orgId },
    { $set: update },
    { upsert: true, returnDocument: "after" },
  ).lean();

  if (!settings) throw new AppError(500, "Failed to save settings");

  const { _id, ...rest } = settings as any;
  processEvent({
    type: "profile_updated",
    category: "auth",
    userId: req.user!.userId,
    orgId: orgId as string,
    createdBy: req.user!.userId,
    title: "Settings updated",
  }).catch(() => {});

  reply.send({ success: true, data: rest });
});
}
