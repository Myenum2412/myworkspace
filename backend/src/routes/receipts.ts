import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { Receipt, RECEIPT_STATUSES } from "../lib/db/models/Receipt.js";
import { Counter } from "../lib/db/models/Counter.js";

const router = Router();
router.use(authenticate);

async function nextReceiptNumber(orgId: string): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    `receipt_${orgId}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `RCPT-${String(counter.seq).padStart(5, "0")}`;
}

// List receipts
router.get("/", async (req: AuthRequest, res: Response) => {
  const { limit, offset, status } = req.query;
  const orgId = req.user!.orgId;
  if (!orgId) throw new AppError(400, "Organization ID required");

  const filter: Record<string, any> = { orgId };
  if (status && status !== "all") filter.status = status;

  const limitNum = Math.min(parseInt(limit as string) || 50, 100);
  const offsetNum = parseInt(offset as string) || 0;

  const [docs, total] = await Promise.all([
    Receipt.find(filter).sort({ createdAt: -1 }).skip(offsetNum).limit(limitNum).select("orgId receiptNumber invoiceId invoiceNumber customerName customerEmail amount currency paymentMethod status notes paidAt createdAt updatedAt").lean(),
    Receipt.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: docs.map((d: any) => ({ ...d, id: d._id.toString() })),
    total,
  });
});

// Get single receipt
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const receipt = await Receipt.findOne({ _id: req.params.id, orgId: req.user!.orgId }).lean();
  if (!receipt) throw new AppError(404, "Receipt not found");
  res.json({ success: true, data: { ...receipt, id: receipt._id.toString() } });
});

// Create receipt
router.post("/", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can create receipts");
  const orgId = req.user!.orgId;
  if (!orgId) throw new AppError(400, "Organization ID required");

  const { invoiceId, invoiceNumber, customerName, customerEmail, amount, currency, paymentMethod, paidAt, notes } = req.body;
  if (!customerName || !amount) {
    throw new AppError(400, "customerName and amount are required");
  }

  const receiptNumber = await nextReceiptNumber(orgId);

  const receipt = await Receipt.create({
    orgId,
    receiptNumber,
    invoiceId,
    invoiceNumber,
    customerName,
    customerEmail,
    amount,
    currency: currency || "INR",
    paymentMethod: paymentMethod || "Bank Transfer",
    status: "paid",
    paidAt: paidAt ? new Date(paidAt) : new Date(),
    notes,
    createdAt: new Date(),
  });

  res.status(201).json({ success: true, data: { ...receipt.toObject(), id: receipt._id.toString() } });
});

// Update receipt status
router.patch("/:id/status", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update receipt status");
  const { status } = req.body;
  if (!status || !RECEIPT_STATUSES.includes(status)) {
    throw new AppError(400, `Invalid status. Must be one of: ${RECEIPT_STATUSES.join(", ")}`);
  }

  const receipt = await Receipt.findOne({ _id: req.params.id, orgId: req.user!.orgId });
  if (!receipt) throw new AppError(404, "Receipt not found");

  receipt.status = status;
  receipt.updatedAt = new Date();
  if (status === "refunded") {
    receipt.notes = receipt.notes
      ? `${receipt.notes} | Refunded at ${new Date().toISOString()}`
      : `Refunded at ${new Date().toISOString()}`;
  }
  await receipt.save();

  res.json({ success: true, data: { ...receipt.toObject(), id: receipt._id.toString() } });
});

// Update receipt
router.put("/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update receipts");
  const { customerName, customerEmail, amount, currency, paymentMethod, paidAt, notes, status } = req.body;
  const receipt = await Receipt.findOne({ _id: req.params.id, orgId: req.user!.orgId });
  if (!receipt) throw new AppError(404, "Receipt not found");

  if (customerName !== undefined) receipt.customerName = customerName;
  if (customerEmail !== undefined) receipt.customerEmail = customerEmail;
  if (amount !== undefined) receipt.amount = amount;
  if (currency !== undefined) receipt.currency = currency;
  if (paymentMethod !== undefined) receipt.paymentMethod = paymentMethod;
  if (paidAt !== undefined) receipt.paidAt = new Date(paidAt);
  if (notes !== undefined) receipt.notes = notes;
  if (status && RECEIPT_STATUSES.includes(status)) receipt.status = status;

  receipt.updatedAt = new Date();
  await receipt.save();

  res.json({ success: true, data: { ...receipt.toObject(), id: receipt._id.toString() } });
});

// Delete receipt
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete receipts");
  const orgId = req.user!.orgId;
  const receipt = await Receipt.findOne({ _id: req.params.id, orgId });
  if (!receipt) throw new AppError(404, "Receipt not found");
  await Receipt.deleteOne({ _id: req.params.id, orgId });
  res.json({ success: true });
});

export default router;
