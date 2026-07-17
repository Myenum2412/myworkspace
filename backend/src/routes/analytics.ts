import { Router, Response } from "express";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { analyticsService, STANDARD_EVENTS, EVENT_CATEGORIES } from "../services/analytics/analytics.service.js";
import { attributionService } from "../services/analytics/attribution.service.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

router.post("/track", optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      eventName, eventCategory, properties = {},
      sessionId, pageUrl, referrer,
      utm, attribution,
    } = req.body;

    if (!eventName) {
      throw new AppError(400, "Missing required field: eventName");
    }

    await analyticsService.track({
      eventName,
      eventCategory: eventCategory || EVENT_CATEGORIES.ENGAGEMENT,
      userId: req.user?.userId,
      orgId: req.user?.orgId,
      anonymousId: req.cookies?.anonymous_id || req.body.anonymousId,
      sessionId,
      properties,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
      pageUrl,
      referrer,
      utm,
      attribution,
    });

    await attributionService.trackAttribution({
      userId: req.user?.userId,
      anonymousId: req.cookies?.anonymous_id || req.body.anonymousId,
      sessionId,
      pageUrl,
      referrer,
      utm,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err }, "Failed to track event");
    throw new AppError(500, "Failed to track event");
  }
});

router.post("/track/batch", optionalAuth, async (req: AuthRequest, res: Response) => {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    throw new AppError(400, "Missing or invalid events array");
  }

  const results = { tracked: 0, failed: 0 };
  await Promise.allSettled(
    events.map(async (event) => {
      try {
        await analyticsService.track({
          eventName: event.eventName,
          eventCategory: event.eventCategory || EVENT_CATEGORIES.ENGAGEMENT,
          userId: req.user?.userId,
          orgId: req.user?.orgId,
          anonymousId: req.cookies?.anonymous_id || event.anonymousId,
          sessionId: event.sessionId,
          properties: event.properties || {},
          pageUrl: event.pageUrl,
          referrer: event.referrer,
          utm: event.utm,
          attribution: event.attribution,
        });
        results.tracked++;
      } catch {
        results.failed++;
      }
    })
  );

  res.json({ success: true, data: results });
});

router.get("/events/:eventName/count", authenticate, async (req: AuthRequest, res: Response) => {
  const { eventName } = req.params;
  const { from, to } = req.query;

  const count = await analyticsService.getEventCount(eventName, {
    from: from ? new Date(from as string) : undefined,
    to: to ? new Date(to as string) : undefined,
    orgId: req.user?.orgId,
  });

  res.json({ success: true, data: { eventName, count } });
});

router.get("/categories/:category", authenticate, async (req: AuthRequest, res: Response) => {
  const { category } = req.params;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 50), 200);
  const skip = (page - 1) * limit;

  const result = await analyticsService.getEventsByCategory(category, {
    from: req.query.from ? new Date(req.query.from as string) : undefined,
    to: req.query.to ? new Date(req.query.to as string) : undefined,
    orgId: req.user?.orgId,
    limit,
    skip,
  });

  res.json({
    success: true,
    data: result.events,
    pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) },
  });
});

router.get("/standard-events", (_req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      categories: EVENT_CATEGORIES,
      events: STANDARD_EVENTS,
    },
  });
});

export default router;
