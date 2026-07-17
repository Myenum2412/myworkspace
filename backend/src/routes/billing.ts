import { Router, Response } from "express";
import { Invoice } from "../lib/db/models/Invoice.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { Counter } from "../lib/db/models/Counter.js";
import { v4 as uuid } from "uuid";

const router = Router();

router.use(authenticate);

async function nextInvoiceNumber(orgId: string): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    `invoice_${orgId}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `INV-${String(counter.seq).padStart(6, "0")}`;
}

// GET /api/billing/invoices — List invoices for the organization
router.get("/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.orgId as string || await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const status = req.query.status as string | undefined;

    const filter: Record<string, any> = { orgId };
    if (status) filter.status = status;

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).select("id orgId number customerId customerName customerEmail amountPaid currency status pdfUrl hostedUrl periodStart periodEnd subTotal discountPercent discountAmount tdsTcsType tdsTcsRate tdsTcsAmount adjustmentValue total isSimplifiedView createdAt updatedAt").lean(),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch invoices");
  }
});

// GET /api/billing/invoices/:id — Get single invoice
router.get("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ id: req.params.id }).select("id orgId number customerId customerName customerEmail amountPaid currency status pdfUrl hostedUrl periodStart periodEnd items subTotal discountPercent discountAmount tdsTcsType tdsTcsRate tdsTcsAmount adjustmentValue total isSimplifiedView createdAt updatedAt").lean();
    if (!invoice) throw new AppError(404, "Invoice not found");
    res.json({ success: true, data: invoice });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch invoice");
  }
});

// POST /api/billing/invoices — Create invoice
router.post("/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.body.orgId || await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);

    const number = req.body.number && req.body.number.trim() ? req.body.number : await nextInvoiceNumber(orgId);
    const invoice = await Invoice.create({
      id: uuid(),
      orgId,
      number,
      customerId: req.body.customerId || "",
      customerName: req.body.customerName || "",
      customerEmail: req.body.customerEmail || "",
      amountPaid: req.body.amountPaid || 0,
      currency: req.body.currency || "inr",
      status: req.body.status || "open",
      pdfUrl: req.body.pdfUrl || "",
      hostedUrl: req.body.hostedUrl || "",
      periodStart: req.body.periodStart ? new Date(req.body.periodStart) : new Date(),
      periodEnd: req.body.periodEnd ? new Date(req.body.periodEnd) : new Date(),
      items: req.body.items || [],
      subTotal: req.body.subTotal || 0,
      discountPercent: req.body.discountPercent || 0,
      discountAmount: req.body.discountAmount || 0,
      tdsTcsType: req.body.tdsTcsType || "",
      tdsTcsRate: req.body.tdsTcsRate || "0",
      tdsTcsAmount: req.body.tdsTcsAmount || 0,
      adjustmentValue: req.body.adjustmentValue || 0,
      total: req.body.total || 0,
      isSimplifiedView: req.body.isSimplifiedView !== false,
    });

    res.status(201).json({ success: true, data: invoice });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to create invoice");
  }
});

// PUT /api/billing/invoices/:id — Update invoice (full replace)
router.put("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ id: req.params.id });
    if (!invoice) throw new AppError(404, "Invoice not found");

    const updates = req.body;
    Object.assign(invoice, updates);
    await invoice.save();

    res.json({ success: true, data: invoice });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update invoice");
  }
});

// PATCH /api/billing/invoices/:id — Partial update
router.patch("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await Invoice.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true }
    ).lean();
    if (!invoice) throw new AppError(404, "Invoice not found");
    res.json({ success: true, data: invoice });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update invoice");
  }
});

// DELETE /api/billing/invoices/:id — Delete invoice
router.delete("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await Invoice.findOneAndDelete({ id: req.params.id });
    if (!invoice) throw new AppError(404, "Invoice not found");
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to delete invoice");
  }
});

export default router;
