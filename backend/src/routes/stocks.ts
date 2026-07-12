import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireString } from "../lib/validate.js";
import { collections } from "../lib/db/collections.js";
import mongoose from "mongoose";
import { v4 as uuid } from "uuid";

const router = Router();

router.use(authenticate);

async function resolveOrgId(userId: string, email?: string, userOrgId?: string): Promise<string> {
  if (userOrgId) return userOrgId;
  const { OrgMember } = await import("../lib/db/models/OrgMember.js");
  const member = await OrgMember.findOne({ userId }).lean();
  if (member) return String(member.orgId);
  if (mongoose.connection.db) {
    const nextAuthMember = await mongoose.connection.db.collection("org_members").findOne({ userId }).catch(() => null);
    if (nextAuthMember) return String(nextAuthMember.orgId);
  }
  throw new AppError(400, "User is not associated with any organization");
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const db = mongoose.connection.db;
  if (!db) throw new AppError(500, "Database connection unavailable");
  const data = await db.collection(collections.stocks).find({ orgId }).sort({ createdAt: -1 }).toArray();
  res.json({ success: true, data });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const productName = requireString(req.body.productName, "productName", { min: 1, max: 300 });
  const db = mongoose.connection.db;
  if (!db) throw new AppError(500, "Database connection unavailable");

  const doc = {
    id: uuid(),
    orgId,
    itemCode: req.body.itemCode || "",
    productName,
    category: req.body.category || "",
    brand: req.body.brand || "",
    unit: req.body.unit || "",
    openingStock: Number(req.body.openingStock) || 0,
    stockIn: Number(req.body.stockIn) || 0,
    stockOut: Number(req.body.stockOut) || 0,
    availableStock: Number(req.body.availableStock) || 0,
    reorderLevel: Number(req.body.reorderLevel) || 0,
    purchasePrice: Number(req.body.purchasePrice) || 0,
    sellingPrice: Number(req.body.sellingPrice) || 0,
    supplier: req.body.supplier || "",
    warehouse: req.body.warehouse || "",
    status: req.body.status || "Active",
    image: req.body.image || "",
    createdBy: req.user!.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(collections.stocks).insertOne(doc);
  res.status(201).json({ success: true, data: doc });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const db = mongoose.connection.db;
  if (!db) throw new AppError(500, "Database connection unavailable");

  const setFields: Record<string, unknown> = { ...req.body, updatedBy: req.user!.userId, updatedAt: new Date() };
  delete setFields.id;
  delete setFields._id;
  delete setFields.orgId;

  const result = await db.collection(collections.stocks).findOneAndUpdate(
    { id: req.params.id, orgId },
    { $set: setFields },
    { returnDocument: "after" },
  );

  if (!result) throw new AppError(404, "Stock not found");
  res.json({ success: true, data: result });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = await resolveOrgId(req.user!.userId, req.user!.email, req.user!.orgId);
  const db = mongoose.connection.db;
  if (!db) throw new AppError(500, "Database connection unavailable");

  const result = await db.collection(collections.stocks).deleteOne({ id: req.params.id, orgId });
  if (result.deletedCount === 0) throw new AppError(404, "Stock not found");
  res.json({ success: true, message: "Stock deleted" });
});

export default router;
