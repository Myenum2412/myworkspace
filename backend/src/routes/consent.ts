// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { v4 as uuid } from "uuid";
import { logger } from "../lib/logger/index.js";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { consentService } from "../services/consent/consent.service.js";
import { detectRegionFromRequest } from "../services/consent/region-detector.js";
import type { AuthRequest } from "../types/index.js";

export default async function plugin(fastify: FastifyInstance) {
function extractConsentPayload(req: AuthRequest) {
  const { categories, source = "banner", policyVersion = 1 } = req.body;

  if (!categories || typeof categories !== "object") {
    throw new AppError(400, "Missing required field: categories");
  }

  const validCategories = [
    "essential",
    "functional",
    "analytics",
    "performance",
    "personalization",
    "marketing",
  ];
  for (const key of validCategories) {
    if (typeof categories[key] !== "boolean") {
      throw new AppError(400, `Invalid or missing category: ${key}`);
    }
  }

  const regionInfo = detectRegionFromRequest(req);
  const anonymousId = req.cookies?.anonymous_id || req.body.anonymousId || uuid();

  return {
    userId: req.user?.userId,
    orgId: req.user?.orgId,
    anonymousId,
    categories: {
      essential: true,
      functional: categories.functional,
      analytics: categories.analytics,
      performance: categories.performance,
      personalization: categories.personalization,
      marketing: categories.marketing,
    },
    source,
    ipAddress:
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress,
    userAgent: req.headers["user-agent"],
    region: regionInfo.region,
    regionInfo,
    policyVersion,
  };
}

fastify.get("/save", optionalAuth, async (req: AuthRequest, reply: any) => {
  try {
    const payload = extractConsentPayload(req);
    const preference = await consentService.saveConsent(payload);

    res.setHeader(
      "Set-Cookie",
      `consent_preferences=${JSON.stringify({
        categories: preference.categories,
        version: preference.consentVersion,
        timestamp: preference.consentTimestamp.toISOString(),
      })}; Path=/; Max-Age=${365 * 24 * 60 * 60}; SameSite=Lax; Secure`,
    );

    reply.send({ success: true, data: preference });
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err }, "Failed to save consent");
    throw new AppError(500, "Failed to save consent preferences");
  }
});

fastify.get("/current", optionalAuth, async (req: AuthRequest, reply: any) => {
  const anonymousId = req.cookies?.anonymous_id || (req.query.anonymousId as string);

  const preference = await consentService.getCurrentConsent({
    userId: req.user?.userId,
    anonymousId: req.user?.userId ? undefined : anonymousId,
  });

  const regionInfo = detectRegionFromRequest(req);

  reply.send({
    success: true,
    data: {
      preference,
      region: regionInfo,
    },
  });
});

fastify.get("/withdraw", optionalAuth, async (req: AuthRequest, reply: any) => {
  const anonymousId = req.cookies?.anonymous_id || (req.body.anonymousId as string);

  await consentService.withdrawConsent(
    { userId: req.user?.userId, anonymousId: req.user?.userId ? undefined : anonymousId },
    req.body.source || "preferences-center",
  );

  reply.send("consent_preferences", { path: "/" });
  reply.send({ success: true, message: "Consent withdrawn successfully" });
});

fastify.get("/history", optionalAuth, async (req: AuthRequest, reply: any) => {
  const anonymousId = req.cookies?.anonymous_id || (req.query.anonymousId as string);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const history = await consentService.getConsentHistory(
    {
      userId: req.user?.userId,
      anonymousId: req.user?.userId ? undefined : anonymousId,
    },
    limit,
  );

  reply.send({ success: true, data: history });
});

fastify.get("/audit-logs", authenticate, async (req: AuthRequest, reply: any) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const result = await consentService.getAuditLogs({
    userId: req.query.userId as string,
    action: req.query.action as string,
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    limit,
    skip,
  });

  reply.send({
    success: true,
    data: result.logs,
    pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
  });
});

fastify.get("/region", async (req: AuthRequest, reply: any) => {
  const regionInfo = detectRegionFromRequest(req);
  reply.send({ success: true, data: regionInfo });
});
}
