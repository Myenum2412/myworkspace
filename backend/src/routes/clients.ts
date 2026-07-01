import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireString, requireEmail } from "../lib/validate.js";
import {
  resolveOrgId,
  listClients,
  getClient,
  getClientWorkspace,
  createClient,
  updateClient,
  deleteClient,
} from "../services/client.service.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const data = await listClients(orgId);
  res.json({ success: true, data, total: data.length });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const data = await getClient(orgId, req.params.id);
  if (!data) throw new AppError(404, "Client not found");
  res.json({ success: true, data });
});

router.get("/:id/workspace", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const data = await getClientWorkspace(orgId, req.params.id);
  res.json({ success: true, data });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const name = requireString(req.body.name, "name", { min: 1, max: 300 });
  const email = requireEmail(req.body.email, "email");
  const primaryContact = requireString(req.body.primaryContact, "primaryContact", { min: 1, max: 500 });

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

  res.status(201).json({ success: true, data: result });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const data = await updateClient(orgId, req.params.id, req.user!.userId, req.user!.email!, req.body);
  res.json({ success: true, data });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  await deleteClient(orgId, req.params.id, req.user!.userId);
  res.json({ success: true, message: "Client deleted" });
});

export default router;
