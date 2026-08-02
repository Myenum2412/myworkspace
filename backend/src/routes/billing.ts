import { Router, Response } from "express";
import { Invoice } from "../lib/db/models/Invoice.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { v4 as uuid } from "uuid";
const router = Router();

router.use(authenticate);

// GET /api/billing/invoices — List invoices for the organization
router.get("/invoices", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.user!.orgId;

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
    throw new AppError(500, err.message || "Could not load invoices");
  }
});

// GET /api/billing/invoices/:id — Get single invoice
router.get("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    const invoice = await Invoice.findOne({ id: req.params.id, orgId: req.user!.orgId }).select("id orgId number customerId customerName customerEmail amountPaid currency status pdfUrl hostedUrl periodStart periodEnd items subTotal discountPercent discountAmount tdsTcsType tdsTcsRate tdsTcsAmount adjustmentValue total isSimplifiedView createdAt updatedAt").lean();
    if (!invoice) throw new AppError(404, "Invoice not found");
    res.json({ success: true, data: invoice });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Could not load invoice");
  }
});

// PUT /api/billing/invoices/:id — Update invoice (full replace)
router.put("/invoices/:id", async (req: AuthRequest, res: Response) => {
  try {
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update invoices");
    const invoice = await Invoice.findOne({ id: req.params.id, orgId: req.user!.orgId });
    if (!invoice) throw new AppError(404, "Invoice not found");

    const { orgId, id, ...updates } = req.body;
    Object.assign(invoice, updates);
    invoice.orgId = req.user!.orgId!;
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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update invoices");
    const { orgId, ...safeBody } = req.body;
    const invoice = await Invoice.findOneAndUpdate(
      { id: req.params.id, orgId: req.user!.orgId },
      { $set: safeBody },
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
    if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete invoices");
    const invoice = await Invoice.findOneAndDelete({ id: req.params.id, orgId: req.user!.orgId });
    if (!invoice) throw new AppError(404, "Invoice not found");
    res.json({ success: true, message: "Invoice deleted" });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to delete invoice");
  }
});

export default router;
