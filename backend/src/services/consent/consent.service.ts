import { v4 as uuid } from "uuid";
import { ConsentRecord, IConsentRecord } from "../../lib/db/models/ConsentRecord.js";
import { ConsentAuditLog } from "../../lib/db/models/ConsentAuditLog.js";
import { RegionInfo } from "./region-detector.js";
import { logger } from "../../lib/logger/index.js";

export type ConsentCategories = Record<"essential" | "functional" | "analytics" | "performance" | "personalization" | "marketing", boolean>;

export interface ConsentInput {
  userId?: string;
  orgId?: string;
  anonymousId?: string;
  categories: ConsentCategories;
  source: "banner" | "preferences-center" | "account-settings" | "api" | "admin";
  ipAddress?: string;
  userAgent?: string;
  region: string;
  regionInfo: RegionInfo;
  policyVersion: number;
  performedBy?: string;
}

export interface ConsentPreference {
  id: string;
  categories: ConsentCategories;
  source: string;
  region: string;
  consentVersion: number;
  policyVersion: number;
  consentTimestamp: Date;
  consentExpiresAt: Date | null;
}

export class ConsentService {
  private readonly DEFAULT_EXPIRY_DAYS = 365;

  async getCurrentConsent(identifier: { userId?: string; anonymousId?: string }): Promise<ConsentPreference | null> {
    const query: Record<string, unknown> = {};
    if (identifier.userId) query.userId = identifier.userId;
    else if (identifier.anonymousId) query.anonymousId = identifier.anonymousId;
    else return null;

    const record = await ConsentRecord.findOne(query)
      .sort({ consentVersion: -1 })
      .lean() as Record<string, unknown> | null;

    if (!record) return null;

    return this.toPreference(record);
  }

  async saveConsent(input: ConsentInput): Promise<ConsentPreference> {
    const previous = await this.getCurrentConsent({
      userId: input.userId,
      anonymousId: input.anonymousId,
    });

    const previousVersion = previous?.consentVersion || 0;
    const now = new Date();
    const expiryDays = input.regionInfo.cookieExpiryDays || this.DEFAULT_EXPIRY_DAYS;
    const consentExpiresAt = input.categories.marketing
      ? new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000)
      : undefined;

    const record = await ConsentRecord.create({
      id: uuid(),
      userId: input.userId,
      orgId: input.orgId,
      anonymousId: input.anonymousId,
      consentVersion: (previous?.consentVersion || 0) + 1,
      categories: {
        ...input.categories,
        essential: true,
      },
      source: input.source,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      region: input.region,
      gdprApplies: input.regionInfo.gdprApplies,
      ccpaApplies: input.regionInfo.ccpaApplies,
      lgpdApplies: input.regionInfo.lgpdApplies,
      pipedaApplies: input.regionInfo.pipedaApplies,
      consentTimestamp: now,
      consentExpiresAt,
      previousConsentId: previous?.id || undefined,
      policyVersion: input.policyVersion,
    });

    await ConsentAuditLog.create({
      id: uuid(),
      consentId: record.id,
      userId: input.userId,
      orgId: input.orgId,
      anonymousId: input.anonymousId,
      action: previous ? "updated" : "created",
      previousState: previous ? { categories: previous.categories } : undefined,
      newState: { categories: input.categories },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      region: input.region,
      source: input.source,
      policyVersion: input.policyVersion,
      performedBy: input.performedBy || input.userId,
    });

    logger.info(
      { userId: input.userId, version: record.consentVersion, categories: input.categories, source: input.source },
      "Consent saved"
    );

    return this.toPreference(record)!;
  }

  async withdrawConsent(identifier: { userId?: string; anonymousId?: string }, source: string): Promise<void> {
    const current = await this.getCurrentConsent(identifier);
    if (!current) return;

    const categories: ConsentCategories = {
      essential: true,
      functional: false,
      analytics: false,
      performance: false,
      personalization: false,
      marketing: false,
    };

    const query: Record<string, unknown> = {};
    if (identifier.userId) query.userId = identifier.userId;
    else if (identifier.anonymousId) query.anonymousId = identifier.anonymousId;

    await ConsentRecord.create({
      id: uuid(),
      ...query,
      consentVersion: (current?.consentVersion || 0) + 1,
      categories,
      source,
      region: current.region,
      gdprApplies: false,
      ccpaApplies: false,
      lgpdApplies: false,
      pipedaApplies: false,
      consentTimestamp: new Date(),
      previousConsentId: current.id,
      policyVersion: current.policyVersion,
    });

    await ConsentAuditLog.create({
      id: uuid(),
      consentId: current.id,
      ...query,
      action: "withdrawn",
      previousState: { categories: current.categories },
      newState: { categories },
      region: current.region,
      source,
      policyVersion: current.policyVersion,
    });
  }

  async getConsentHistory(identifier: { userId?: string; anonymousId?: string }, limit = 50): Promise<ConsentPreference[]> {
    const query: Record<string, unknown> = {};
    if (identifier.userId) query.userId = identifier.userId;
    else if (identifier.anonymousId) query.anonymousId = identifier.anonymousId;

    const records = await ConsentRecord.find(query)
      .sort({ consentVersion: -1 })
      .limit(limit)
      .lean() as Record<string, unknown>[];

    return records.map(r => this.toPreference(r)).filter((p): p is ConsentPreference => p !== null);
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    from?: Date;
    to?: Date;
    limit?: number;
    skip?: number;
  }) {
    const query: Record<string, unknown> = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.action) query.action = filters.action;
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) (query.createdAt as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (query.createdAt as Record<string, unknown>).$lte = filters.to;
    }

    const [logs, total] = await Promise.all([
      ConsentAuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(filters.skip || 0)
        .limit(filters.limit || 50)
        .lean(),
      ConsentAuditLog.countDocuments(query),
    ]);

    return { logs, total };
  }

  async getConsentStats(filters?: { from?: Date; to?: Date; region?: string }) {
    const match: Record<string, unknown> = {};
    if (filters?.from || filters?.to) {
      match.consentTimestamp = {};
      if (filters.from) (match.consentTimestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.consentTimestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.region) match.region = filters.region;

    const stats = await ConsentRecord.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          essential: { $sum: { $cond: ["$categories.essential", 1, 0] } },
          functional: { $sum: { $cond: ["$categories.functional", 1, 0] } },
          analytics: { $sum: { $cond: ["$categories.analytics", 1, 0] } },
          performance: { $sum: { $cond: ["$categories.performance", 1, 0] } },
          personalization: { $sum: { $cond: ["$categories.personalization", 1, 0] } },
          marketing: { $sum: { $cond: ["$categories.marketing", 1, 0] } },
        },
      },
    ]);

    const regionBreakdown = await ConsentRecord.aggregate([
      { $match: match },
      { $group: { _id: "$region", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const sourceBreakdown = await ConsentRecord.aggregate([
      { $match: match },
      { $group: { _id: "$source", count: { $sum: 1 } } },
    ]);

    const data = stats[0] || { total: 0, essential: 0, functional: 0, analytics: 0, performance: 0, personalization: 0, marketing: 0 };

    return {
      totalConsent: data.total,
      acceptanceRates: {
        essential: data.total ? Math.round((data.essential / data.total) * 100) : 0,
        functional: data.total ? Math.round((data.functional / data.total) * 100) : 0,
        analytics: data.total ? Math.round((data.analytics / data.total) * 100) : 0,
        performance: data.total ? Math.round((data.performance / data.total) * 100) : 0,
        personalization: data.total ? Math.round((data.personalization / data.total) * 100) : 0,
        marketing: data.total ? Math.round((data.marketing / data.total) * 100) : 0,
      },
      regionBreakdown: regionBreakdown.map(r => ({ region: r._id, count: r.count })),
      sourceBreakdown: sourceBreakdown.map(s => ({ source: s._id, count: s.count })),
    };
  }

  async rotatePolicyVersion(newVersion: number): Promise<number> {
    const result = await ConsentRecord.updateMany(
      { policyVersion: { $lt: newVersion } },
      { $set: { policyVersion: newVersion } }
    );
    return result.modifiedCount;
  }

  private toPreference(record: Record<string, unknown> | null): ConsentPreference | null {
    if (!record) return null;
    return {
      id: record.id as string,
      categories: record.categories as ConsentCategories,
      source: record.source as string,
      region: record.region as string,
      consentVersion: record.consentVersion as number,
      policyVersion: record.policyVersion as number,
      consentTimestamp: record.consentTimestamp as Date,
      consentExpiresAt: (record.consentExpiresAt as Date) || null,
    };
  }
}

export const consentService = new ConsentService();
