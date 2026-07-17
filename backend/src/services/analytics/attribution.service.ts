import { AnalyticsEvent } from "../../lib/db/models/AnalyticsEvent.js";
import { ConversionFunnel } from "../../lib/db/models/ConversionFunnel.js";
import { logger } from "../../lib/logger/index.js";

export interface AttributionData {
  firstTouch: {
    source: string;
    medium: string;
    campaign: string;
    channel: string;
    timestamp: Date | null;
  };
  lastTouch: {
    source: string;
    medium: string;
    campaign: string;
    channel: string;
    timestamp: Date | null;
  };
  multiTouch: Array<{
    source: string;
    medium: string;
    campaign: string;
    channel: string;
    weight: number;
    timestamp: Date;
  }>;
  channels: string[];
  attributionModel: "first_touch" | "last_touch" | "multi_touch";
}

export interface CampaignPerformance {
  campaign: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  cost: number;
  roas: number;
  cac: number;
}

export class AttributionService {
  async trackAttribution(params: {
    userId?: string;
    anonymousId?: string;
    sessionId?: string;
    pageUrl?: string;
    referrer?: string;
    utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const channel = this.detectChannel(params.utm, params.referrer);

    const attribution = await this.getStoredAttribution(params.userId || params.anonymousId || "");
    const now = new Date();

    let firstTouch = attribution?.firstTouch || {
      source: params.utm?.source || "direct",
      medium: params.utm?.medium || "none",
      campaign: params.utm?.campaign || "",
      channel,
      timestamp: now,
    };

    const lastTouch = {
      source: params.utm?.source || "direct",
      medium: params.utm?.medium || "none",
      campaign: params.utm?.campaign || "",
      channel,
      timestamp: now,
    };
  }

  private detectChannel(
    utm?: { source?: string; medium?: string; campaign?: string },
    referrer?: string
  ): string {
    if (!utm || !utm.source) {
      if (!referrer || referrer === "") return "direct";
      if (referrer.includes("google")) return "organic_search";
      if (referrer.includes("facebook") || referrer.includes("fb")) return "organic_social";
      if (referrer.includes("linkedin")) return "organic_social";
      if (referrer.includes("twitter") || referrer.includes("x")) return "organic_social";
      return "referral";
    }

    const source = (utm.source || "").toLowerCase();
    const medium = (utm.medium || "").toLowerCase();

    if (medium === "cpc" || medium === "ppc" || medium === "paidsearch") return "paid_search";
    if (medium === "social" || medium === "socialmedia") return "paid_social";
    if (medium === "email") return "email";
    if (medium === "affiliate" || medium === "referral") return "referral";
    if (medium === "display" || medium === "banner") return "display";
    if (medium === "organic" || source === "google") return "organic_search";
    if (medium === "direct" || source === "direct") return "direct";

    return "other";
  }

  async getStoredAttribution(userKey: string): Promise<{
    firstTouch: { source: string; medium: string; campaign: string; channel: string; timestamp: Date };
    lastTouch: { source: string; medium: string; campaign: string; channel: string; timestamp: Date };
  } | null> {
    const query = {
      $or: [{ userId: userKey }, { anonymousId: userKey }],
      "utm.source": { $exists: true, $ne: null },
    };

    const [firstEvent, lastEvent] = await Promise.all([
      AnalyticsEvent.findOne(query).sort({ timestamp: 1 }).lean() as Promise<Record<string, unknown> | null>,
      AnalyticsEvent.findOne(query).sort({ timestamp: -1 }).lean() as Promise<Record<string, unknown> | null>,
    ]);

    if (!firstEvent && !lastEvent) return null;

    const fu = firstEvent?.utm as Record<string, unknown> | undefined;
    const lu = lastEvent?.utm as Record<string, unknown> | undefined;

    return {
      firstTouch: {
        source: (fu?.source as string) || "direct",
        medium: (fu?.medium as string) || "none",
        campaign: (fu?.campaign as string) || "",
        channel: this.detectChannel(
          fu ? { source: fu.source as string, medium: fu.medium as string, campaign: fu.campaign as string } : undefined,
          firstEvent?.referrer as string
        ),
        timestamp: (firstEvent?.timestamp as Date) || new Date(),
      },
      lastTouch: {
        source: (lu?.source as string) || "direct",
        medium: (lu?.medium as string) || "none",
        campaign: (lu?.campaign as string) || "",
        channel: this.detectChannel(
          lu ? { source: lu.source as string, medium: lu.medium as string, campaign: lu.campaign as string } : undefined,
          lastEvent?.referrer as string
        ),
        timestamp: (lastEvent?.timestamp as Date) || new Date(),
      },
    };
  }

  async getCampaignPerformance(filters?: { from?: Date; to?: Date; orgId?: string }): Promise<CampaignPerformance[]> {
    const match: Record<string, unknown> = {
      "utm.campaign": { $exists: true, $ne: "" },
    };
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) match.orgId = filters.orgId;

    const campaigns = await AnalyticsEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$utm.campaign",
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: { $ifNull: ["$userId", "$anonymousId"] } },
          sources: { $addToSet: "$utm.source" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return campaigns.map(c => {
      const conversions = c.uniqueUsers.length;
      return {
        campaign: c._id,
        impressions: c.count,
        clicks: c.count,
        conversions,
        revenue: conversions * 50,
        conversionRate: c.count > 0 ? Math.round((conversions / c.count) * 10000) / 100 : 0,
        cost: 0,
        roas: 0,
        cac: 0,
      };
    });
  }

  async getConversionFunnel(funnelName: string, orgId: string, filters?: { from?: Date; to?: Date }) {
    const funnel = await ConversionFunnel.findOne({ orgId, name: funnelName }).lean() as Record<string, unknown> | null;
    if (!funnel) return null;

    const stepsData = funnel.steps as Array<{ name: string; eventName: string; order: number }> | undefined;
    if (!stepsData) return null;

    const match: Record<string, unknown> = { orgId };
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }

    const steps = await Promise.all(
      stepsData.sort((a, b) => a.order - b.order).map(async step => {
        const count = await AnalyticsEvent.countDocuments({
          ...match,
          eventName: step.eventName,
        });
        const uniqueUsers = (await AnalyticsEvent.distinct("userId", {
          ...match,
          eventName: step.eventName,
        })).length;

        return {
          name: step.name,
          eventName: step.eventName,
          order: step.order,
          count,
          uniqueUsers,
        };
      })
    );

    let previousUsers = steps[0]?.uniqueUsers || 0;
    const stepsWithConversion = steps.map((step: { name: string; eventName: string; order: number; count: number; uniqueUsers: number }, i: number) => {
      const conversion = i === 0 ? 100 : previousUsers > 0 ? Math.round((step.uniqueUsers / previousUsers) * 10000) / 100 : 0;
      previousUsers = step.uniqueUsers;
      return { ...step, conversionRate: conversion };
    });

    return {
      funnelName,
      steps: stepsWithConversion,
      overallConversion: stepsWithConversion.length > 1 ? stepsWithConversion[stepsWithConversion.length - 1].conversionRate : 100,
    };
  }

  async getChannelPerformance(filters?: { from?: Date; to?: Date; orgId?: string }) {
    const match: Record<string, unknown> = {};
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) match.orgId = filters.orgId;

    const channels = await AnalyticsEvent.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$attribution.channel",
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: "$userId" },
          conversions: { $sum: { $cond: [{ $eq: ["$eventName", "sign_up"] }, 1, 0] } },
        },
      },
      { $sort: { count: -1 } },
    ]);

    return channels.map(c => ({
      channel: c._id || "direct",
      events: c.count,
      uniqueUsers: c.uniqueUsers.length,
      conversions: c.conversions,
      conversionRate: c.count > 0 ? Math.round((c.conversions / c.count) * 10000) / 100 : 0,
    }));
  }

  async getAttributionReport(filters?: { from?: Date; to?: Date; orgId?: string }) {
    const [channelPerformance, campaignPerformance, attributionModel] = await Promise.all([
      this.getChannelPerformance(filters),
      this.getCampaignPerformance(filters),
      this.getAttributionModelBreakdown(filters),
    ]);

    return {
      channels: channelPerformance,
      campaigns: campaignPerformance,
      attributionModel: {
        firstTouch: attributionModel.firstTouch,
        lastTouch: attributionModel.lastTouch,
      },
    };
  }

  private async getAttributionModelBreakdown(filters?: { from?: Date; to?: Date; orgId?: string }) {
    const match: Record<string, unknown> = {};
    if (filters?.orgId) match.orgId = filters.orgId;

    const conversionEvents = await AnalyticsEvent.find({
      ...match,
      eventName: "sign_up",
    })
      .sort({ timestamp: 1 })
      .lean();

    let firstTouch = 0;
    let lastTouch = 0;

    for (const event of conversionEvents) {
      if (event.attribution?.firstTouch) firstTouch++;
      if (event.attribution?.lastTouch) lastTouch++;
    }

    return {
      firstTouch,
      lastTouch,
    };
  }

  async getLTV(filters?: { from?: Date; to?: Date; orgId?: string }): Promise<number> {
    const match: Record<string, unknown> = {};
    if (filters?.orgId) match.orgId = filters.orgId;

    const revenueEvents = await AnalyticsEvent.find({
      ...match,
      eventName: "payment_success",
    }).lean();

    const totalRevenue = revenueEvents.reduce((sum: number, e) => {
      return sum + (typeof e.properties?.amount === "number" ? e.properties.amount : 0);
    }, 0);

    const uniqueUsers = new Set(revenueEvents.map(e => e.userId).filter(Boolean));
    return uniqueUsers.size > 0 ? Math.round(totalRevenue / uniqueUsers.size * 100) / 100 : 0;
  }

  async getChurnRate(filters?: { from?: Date; to?: Date; orgId?: string }): Promise<number> {
    const match: Record<string, unknown> = { eventName: { $in: ["user_churn", "subscription_cancelled"] } };
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) match.orgId = filters.orgId;

    const churned = await AnalyticsEvent.countDocuments(match);
    const total = await AnalyticsEvent.countDocuments({ eventName: "sign_up" });

    return total > 0 ? Math.round((churned / total) * 10000) / 100 : 0;
  }

  async getActivationRate(filters?: { from?: Date; to?: Date; orgId?: string }): Promise<number> {
    const match: Record<string, unknown> = {};
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) match.orgId = filters.orgId;

    const signedUp = await AnalyticsEvent.countDocuments({ ...match, eventName: "sign_up" });
    const activated = await AnalyticsEvent.countDocuments({ ...match, eventName: "onboarding_complete" });

    return signedUp > 0 ? Math.round((activated / signedUp) * 10000) / 100 : 0;
  }
}

export const attributionService = new AttributionService();
