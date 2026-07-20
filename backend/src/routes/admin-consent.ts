import { Router, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { platformAdminOnly } from "../middleware/authorize.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { consentService } from "../services/consent/consent.service.js";
import { analyticsService } from "../services/analytics/analytics.service.js";
import { attributionService } from "../services/analytics/attribution.service.js";
import { scriptLoaderService } from "../services/analytics/script-loader.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

router.use(authenticate);
router.use(platformAdminOnly());

// ── Consent Dashboard ──

router.get("/consent/stats", async (req: AuthRequest, res: Response) => {
  const stats = await consentService.getConsentStats({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    region: req.query.region as string,
  });

  res.json({ success: true, data: stats });
});

router.get("/consent/audit-logs", async (req: AuthRequest, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const result = await consentService.getAuditLogs({
    action: req.query.action as string,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    limit,
    skip,
  });

  res.json({
    success: true,
    data: result.logs,
    pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
  });
});

router.post("/consent/rotate-policy", async (req: AuthRequest, res: Response) => {
  const { newVersion } = req.body;
  if (!newVersion || typeof newVersion !== "number") {
    throw new AppError(400, "Missing required field: newVersion");
  }

  const count = await consentService.rotatePolicyVersion(newVersion);
  logger.info({ newVersion, affectedRecords: count, performedBy: req.user?.userId }, "Policy version rotated");

  res.json({ success: true, data: { affectedRecords: count, newVersion } });
});

// ── Analytics Dashboard ──

router.get("/analytics/overview", async (req: AuthRequest, res: Response) => {
  const analytics = await analyticsService.getDashboardAnalytics({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  const errorRate = await analyticsService.getErrorRate({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
  });

  res.json({ success: true, data: { ...analytics, errorRate } });
});

router.get("/analytics/feature-adoption", async (req: AuthRequest, res: Response) => {
  const { featureName } = req.query;
  if (!featureName) {
    throw new AppError(400, "Missing required query: featureName");
  }

  const adoption = await analyticsService.getFeatureAdoption(featureName as string, {
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  res.json({ success: true, data: adoption });
});

router.get("/analytics/retention-cohorts", async (req: AuthRequest, res: Response) => {
  const cohorts = await analyticsService.getRetentionCohorts({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  res.json({ success: true, data: cohorts });
});

// ── Attribution Dashboard ──

router.get("/attribution/report", async (req: AuthRequest, res: Response) => {
  const report = await attributionService.getAttributionReport({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  const ltv = await attributionService.getLTV({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  const churnRate = await attributionService.getChurnRate({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  const activationRate = await attributionService.getActivationRate({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  res.json({
    success: true,
    data: {
      ...report,
      ltv,
      churnRate,
      activationRate,
    },
  });
});

router.get("/attribution/channels", async (req: AuthRequest, res: Response) => {
  const channels = await attributionService.getChannelPerformance({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  res.json({ success: true, data: channels });
});

router.get("/attribution/campaigns", async (req: AuthRequest, res: Response) => {
  const campaigns = await attributionService.getCampaignPerformance({
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
  });

  res.json({ success: true, data: campaigns });
});

router.get("/attribution/funnel", async (req: AuthRequest, res: Response) => {
  const { funnelName = "default" } = req.query;

  const funnel = await attributionService.getConversionFunnel(
    funnelName as string,
    req.user?.orgId || "",
    {
      from: req.query.from ? new Date(req.query.from as string) : undefined,
      to: req.query.to ? new Date(req.query.to as string) : undefined,
    }
  );

  if (!funnel) {
    throw new AppError(404, `Funnel "${funnelName}" not found. Create it first via POST /api/admin/attribution/funnel`);
  }

  res.json({ success: true, data: funnel });
});

router.post("/attribution/funnel", async (req: AuthRequest, res: Response) => {
  const { name, steps } = req.body;
  if (!name || !Array.isArray(steps) || steps.length === 0) {
    throw new AppError(400, "Missing required fields: name (string) and steps (array)");
  }

  const { ConversionFunnel } = await import("../lib/db/models/ConversionFunnel.js");
  const { v4: uuid } = await import("uuid");

  const funnel = await ConversionFunnel.findOneAndUpdate(
    { orgId: req.user?.orgId, name },
    {
      $setOnInsert: { id: uuid(), orgId: req.user?.orgId, name },
      $set: {
        steps: steps.map((s: { name: string; eventName: string; order: number }, i: number) => ({
          name: s.name,
          eventName: s.eventName,
          order: s.order ?? i + 1,
        })),
      },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: funnel });
});

// ── Script Loader ──

router.get("/scripts", async (_req: AuthRequest, res: Response) => {
  const scripts = scriptLoaderService.getAllScripts();
  res.json({ success: true, data: scripts });
});

router.get("/scripts/loader", async (req: AuthRequest, res: Response) => {
  const scripts = scriptLoaderService.getAllScripts();
  const consentEndpoint = `${req.protocol}://${req.get("host")}/api/consent/current`;
  const loader = scriptLoaderService.generateConsentAwareLoader(scripts, consentEndpoint);

  res.setHeader("Content-Type", "application/javascript");
  res.setHeader("Cache-Control", "public, max-age=3600, immutable");
  res.send(loader);
});

export default router;
