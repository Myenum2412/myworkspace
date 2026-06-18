import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { Client } from "../lib/db/models/Client.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/", async (_req: AuthRequest, res: Response) => {
  const clients = await Client.find().sort({ createdAt: -1 }).lean();
  res.json(clients);
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const client = await Client.findOne({ id: req.params.id }).lean();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const client = new Client({ ...req.body, id: uuid() });
  await client.save();
  res.status(201).json(client.toObject());
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const client = await Client.findOneAndUpdate({ id: req.params.id }, { $set: req.body }, { new: true }).lean();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const client = await Client.findOneAndDelete({ id: req.params.id }).lean();
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json({ success: true });
});

export default router;
