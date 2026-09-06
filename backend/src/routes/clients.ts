// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { notifyClient } from "../lib/notifications/notification-wiring.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { requireEmail, requireString } from "../lib/validate.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { cacheEnhanced } from "../middleware/cache-enhanced.js";
import { AppError } from "../middleware/error.js";
import {
  createClient,
  deleteClient,
  getClient,
  getClientWorkspace,
  listClients,
  updateClient,
} from "../services/client.service.js";
import { createNotification } from "../services/notification.service.js";

export default async function plugin(fastify: FastifyInstance) {
/**
 * The orgId must always come from the authenticated session. If a caller
 * sends one that does not match, it is a tenant-escape attempt → 403.
 */
function assertNoOrgOverride(req: AuthRequest): void {
  const requestOrg = (req.body?.orgId as unknown) ?? (req.query?.orgId as unknown);
  if (requestOrg === undefined || requestOrg === null || requestOrg === "") return;
  if (String(requestOrg) !== String(req.user!.orgId)) {
    throw new AppError(403, "Access denied: organization mismatch");
  }
}

fastify.get(
  "/",
  cacheEnhanced({ ttl: 30, varyByOrg: true, tags: ["clients"] }),
  async (req: AuthRequest, reply: any) => {
    const orgId = req.user!.orgId!;
    const data = await listClients(orgId);
    reply.send({ success: true, data, total: data.length });
  },
);

fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  const orgId = req.user!.orgId!;
  const data = await getClient(orgId, req.params.id);
  if (!data) throw new AppError(404, "Client not found");
  reply.send({ success: true, data });
});

fastify.get("/:id/workspace", async (req: AuthRequest, reply: any) => {
  const orgId = req.user!.orgId!;
  const data = await getClientWorkspace(orgId, req.params.id);
  reply.send({ success: true, data });
});

fastify.get("/", async (req: AuthRequest, reply: any) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can create clients");
  assertNoOrgOverride(req);
  const orgId = req.user!.orgId!;
  const name = requireString(req.body.name, "name", { min: 1, max: 300 });
  const email = requireEmail(req.body.email, "email");
  const primaryContact = requireString(req.body.primaryContact, "primaryContact", {
    min: 1,
    max: 500,
  });

  const result = await createClient({
    orgId,
    adminId: req.user!.userId,
    adminEmail: req.user!.email!,
    name,
    email,
    primaryContact,
    password: req.body.password,
    body: req.body,
  });

  notifyClient
    .created(req.user!.userId, orgId, req.user!.userId, result.client.name, result.client.id)
    .catch(() => {});
  reply.send(201).json({ success: true, data: result });
});

fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update clients");
  assertNoOrgOverride(req);
  const orgId = req.user!.orgId!;
  const data = await updateClient(
    orgId,
    req.params.id,
    req.user!.userId,
    req.user!.email!,
    req.body,
  );
  notifyClient
    .updated(req.user!.userId, orgId, req.user!.userId, data.name || "Client", req.params.id)
    .catch(() => {});
  reply.send({ success: true, data });
});

fastify.get("/:id", async (req: AuthRequest, reply: any) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete clients");
  assertNoOrgOverride(req);
  const orgId = req.user!.orgId!;
  const deletedClient = await getClient(orgId, req.params.id);
  const deletedName = deletedClient?.name;
  await deleteClient(orgId, req.params.id, req.user!.userId);
  createNotification({
    userId: req.user!.userId,
    orgId,
    createdBy: req.user!.userId,
    type: "system",
    category: "clients",
    title: "Client Deleted",
    message: `${deletedName || "Client"} was deleted`,
    link: "/clients",
    metadata: { clientId: req.params.id, clientName: deletedName },
  }).catch(() => {});
  reply.send({ success: true, message: "Client deleted" });
});
}
