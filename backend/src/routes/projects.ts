import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";

const router = Router();

router.use(authenticate);

const getCollection = () => mongoose.connection.db.collection("projects");

async function getUserOrgId(userId: string): Promise<string> {
  const member = await OrgMember.findOne({ userId }).lean();
  if (!member) throw new AppError(403, "User is not a member of any organization");
  return member.orgId.toString();
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await getUserOrgId(req.user!.userId);
  const projects = await getCollection().find({ orgId }).sort({ createdAt: -1 }).toArray();
  res.json({ success: true, data: projects.map(normalize) });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { orgId, name, client, color, access, status } = req.body;
  if (!name) { res.status(400).json({ error: "Name is required" }); return; }

  const doc = {
    id: uuid(),
    orgId,
    name,
    client: client || "",
    color: color || "#3b82f6",
    tracked: 0,
    progress: 0,
    access: access || "Public",
    status: status || "Active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await getCollection().insertOne(doc);
  res.status(201).json({ success: true, data: normalize(doc) });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await getUserOrgId(req.user!.userId);
  const existing = await getCollection().findOne({ id: req.params.id });
  if (!existing) { res.status(404).json({ error: "Project not found" }); return; }
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to modify this project");

  const { name, client, color, access, status, tracked, progress } = req.body;
  const update: Record<string, any> = { updatedAt: new Date() };
  if (name !== undefined) update.name = name;
  if (client !== undefined) update.client = client;
  if (color !== undefined) update.color = color;
  if (access !== undefined) update.access = access;
  if (status !== undefined) update.status = status;
  if (tracked !== undefined) update.tracked = tracked;
  if (progress !== undefined) update.progress = progress;

  const result = await getCollection().findOneAndUpdate(
    { id: req.params.id },
    { $set: update },
    { returnDocument: "after" }
  );
  if (!result) { res.status(404).json({ error: "Project not found" }); return; }
  res.json({ success: true, data: normalize(result) });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userOrgId = await getUserOrgId(req.user!.userId);
  const existing = await getCollection().findOne({ id: req.params.id });
  if (!existing) { res.status(404).json({ error: "Project not found" }); return; }
  if (existing.orgId !== userOrgId) throw new AppError(403, "Not authorized to delete this project");

  const result = await getCollection().deleteOne({ id: req.params.id });
  res.json({ success: true });
});

type ProjectDoc = { _id?: any; id?: string; [key: string]: any };

function normalize(doc: ProjectDoc) {
  const { _id, ...rest } = doc;
  return rest;
}

export default router;
