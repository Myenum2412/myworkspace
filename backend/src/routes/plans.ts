import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { platformAdminOnly } from "../middleware/authorize.js";
import { requireString, optionalString, optionalArray } from "../lib/validate.js";
import * as planService from "../services/plan.service.js";

const router = Router();
router.use(authenticate);
router.use(platformAdminOnly());

// ── Plan CRUD ──

router.get("/", async (req: AuthRequest, res: Response) => {
  const status = req.query.status as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));

  const result = await planService.listPlans({ status, page, limit });
  res.json({ success: true, data: result.data, pagination: result.pagination });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const plan = await planService.getPlan(req.params.id);
  res.json({ success: true, data: plan });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const name = requireString(req.body.name, "name", { min: 1, max: 100 });
  const description = optionalString(req.body.description, "description", { max: 500 });
  const priceMonthly = typeof req.body.priceMonthly === "number" ? req.body.priceMonthly : 0;
  const priceYearly = typeof req.body.priceYearly === "number" ? req.body.priceYearly : 0;
  const currency = optionalString(req.body.currency, "currency", { max: 3 }) || "USD";
  const limits = req.body.limits || undefined;
  const features = req.body.features || undefined;

  const plan = await planService.createPlan({
    name, description, priceMonthly, priceYearly, currency, limits, features,
  }, req.user!.userId);

  res.status(201).json({ success: true, data: plan });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  const plan = await planService.updatePlan(req.params.id, {
    name: req.body.name,
    description: req.body.description,
    priceMonthly: req.body.priceMonthly,
    priceYearly: req.body.priceYearly,
    currency: req.body.currency,
    limits: req.body.limits,
    features: req.body.features,
    status: req.body.status,
  }, req.user!.userId);

  res.json({ success: true, data: plan });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  await planService.deletePlan(req.params.id, req.user!.userId);
  res.json({ success: true, message: "Plan archived" });
});

// ── Subscription Management ──

router.post("/:planId/assign", async (req: AuthRequest, res: Response) => {
  const { orgId, billingCycle, reason } = req.body;
  if (!orgId) throw new AppError(400, "orgId is required");

  const sub = await planService.assignPlanToOrg(
    orgId,
    req.params.planId,
    billingCycle || "monthly",
    req.user!.userId,
    reason,
  );

  res.json({ success: true, data: sub });
});

router.post("/:planId/upgrade", async (req: AuthRequest, res: Response) => {
  const { orgId, reason } = req.body;
  if (!orgId) throw new AppError(400, "orgId is required");

  const sub = await planService.upgradeOrgPlan(
    orgId,
    req.params.planId,
    req.user!.userId,
    reason,
  );

  res.json({ success: true, data: sub });
});

router.post("/:planId/cancel", async (req: AuthRequest, res: Response) => {
  const { orgId, reason } = req.body;
  if (!orgId) throw new AppError(400, "orgId is required");

  await planService.cancelOrgSubscription(orgId, req.user!.userId, reason);
  res.json({ success: true, message: "Subscription canceled" });
});

export default router;
