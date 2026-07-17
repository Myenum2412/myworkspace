import { v4 as uuid } from "uuid";
import { AnalyticsEvent } from "../../lib/db/models/AnalyticsEvent.js";
import { logger } from "../../lib/logger/index.js";

export type ConsentCategories = Record<string, boolean>;

export interface TrackEventInput {
  eventName: string;
  eventCategory: string;
  userId?: string;
  orgId?: string;
  anonymousId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  consentCategories?: string[];
  ipAddress?: string;
  userAgent?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  attribution?: {
    firstTouch?: string;
    lastTouch?: string;
    channel?: string;
    campaign?: string;
  };
}

interface QueuedEvent {
  input: TrackEventInput;
  retries: number;
  maxRetries: number;
}

export const EVENT_CATEGORIES = {
  ENGAGEMENT: "engagement",
  AUTH: "auth",
  ONBOARDING: "onboarding",
  WORKSPACE: "workspace",
  PROJECT: "project",
  FILE: "file",
  COLLABORATION: "collaboration",
  SUBSCRIPTION: "subscription",
  PAYMENT: "payment",
  FEATURE: "feature",
  RETENTION: "retention",
  CHURN: "churn",
  SUPPORT: "support",
  AI: "ai",
  SEARCH: "search",
  DASHBOARD: "dashboard",
  BUSINESS: "business",
  ERROR: "error",
} as const;

export const STANDARD_EVENTS = {
  // Landing & Engagement
  PAGE_VIEW: "page_view",
  LANDING_PAGE_VISIT: "landing_page_visit",
  SESSION_START: "session_start",
  SESSION_END: "session_end",
  DASHBOARD_VIEW: "dashboard_view",

  // Auth
  SIGN_UP: "sign_up",
  LOGIN: "login",
  LOGOUT: "logout",
  PASSWORD_RESET: "password_reset",

  // Onboarding
  ONBOARDING_START: "onboarding_start",
  ONBOARDING_STEP: "onboarding_step",
  ONBOARDING_COMPLETE: "onboarding_complete",

  // Workspace
  WORKSPACE_CREATED: "workspace_created",
  WORKSPACE_SETTINGS_UPDATED: "workspace_settings_updated",

  // Project
  PROJECT_CREATED: "project_created",
  PROJECT_UPDATED: "project_updated",
  PROJECT_COMPLETED: "project_completed",
  PROJECT_DELETED: "project_deleted",

  // Files
  FILE_UPLOADED: "file_uploaded",
  FILE_DOWNLOADED: "file_downloaded",
  FILE_DELETED: "file_deleted",
  FILE_SHARED: "file_shared",

  // Collaboration
  INVITATION_SENT: "invitation_sent",
  INVITATION_ACCEPTED: "invitation_accepted",
  MEMBER_ADDED: "member_added",
  MEMBER_REMOVED: "member_removed",
  COMMENT_CREATED: "comment_created",

  // Subscription & Billing
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",
  SUBSCRIPTION_DOWNGRADED: "subscription_downgraded",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",
  PAYMENT_METHOD_UPDATED: "payment_method_updated",
  TRIAL_STARTED: "trial_started",
  TRIAL_ENDING_SOON: "trial_ending_soon",
  TRIAL_EXPIRED: "trial_expired",

  // Feature Adoption
  FEATURE_ENABLED: "feature_enabled",
  FEATURE_USED: "feature_used",
  INTEGRATION_CONNECTED: "integration_connected",

  // AI
  AI_QUERY: "ai_query",
  AI_RESPONSE: "ai_response",
  AI_FEEDBACK: "ai_feedback",

  // Search
  SEARCH_PERFORMED: "search_performed",
  SEARCH_RESULT_CLICKED: "search_result_clicked",

  // Retention & Churn
  USER_RETENTION: "user_retention",
  USER_CHURN: "user_churn",
  USER_REACTIVATED: "user_reactivated",
  USER_INACTIVE: "user_inactive",

  // Support
  SUPPORT_TICKET_CREATED: "support_ticket_created",
  SUPPORT_TICKET_RESOLVED: "support_ticket_resolved",
  HELP_CENTER_VIEWED: "help_center_viewed",

  // Business
  LEAD_CAPTURED: "lead_captured",
  DEMO_REQUESTED: "demo_requested",
  CONTACT_SUBMITTED: "contact_submitted",
} as const;

export class AnalyticsService {
  private eventQueue: QueuedEvent[] = [];
  private processing = false;
  private dedupCache = new Set<string>();
  private readonly BATCH_SIZE = 25;
  private readonly BATCH_INTERVAL_MS = 2000;
  private readonly DEDUP_TTL_MS = 60000;
  private readonly MAX_RETRIES = 3;
  private intervalHandle?: ReturnType<typeof setInterval>;

  constructor() {
    this.startBatchProcessor();
  }

  private getEventDedupKey(input: TrackEventInput): string {
    return `${input.eventName}:${input.userId || input.anonymousId || "anon"}:${input.sessionId || "nosession"}:${Math.floor(Date.now() / 30000)}`;
  }

  private isDuplicate(input: TrackEventInput): boolean {
    const key = this.getEventDedupKey(input);
    if (this.dedupCache.has(key)) return true;
    this.dedupCache.add(key);
    setTimeout(() => this.dedupCache.delete(key), this.DEDUP_TTL_MS);
    return false;
  }

  async track(input: TrackEventInput): Promise<void> {
    if (this.isDuplicate(input)) {
      logger.debug({ eventName: input.eventName }, "Duplicate event skipped");
      return;
    }

    this.eventQueue.push({
      input: {
        ...input,
        properties: {
          ...input.properties,
          timestamp: new Date().toISOString(),
          event_id: uuid(),
        },
      },
      retries: 0,
      maxRetries: this.MAX_RETRIES,
    });

    if (this.eventQueue.length >= this.BATCH_SIZE) {
      await this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) return;
    this.processing = true;

    const batch = this.eventQueue.splice(0, this.BATCH_SIZE);
    const documents = batch.map(item => ({
      id: uuid(),
      eventName: item.input.eventName,
      eventCategory: item.input.eventCategory,
      userId: item.input.userId,
      orgId: item.input.orgId,
      anonymousId: item.input.anonymousId,
      sessionId: item.input.sessionId,
      properties: item.input.properties || {},
      consentCategories: item.input.consentCategories || [],
      timestamp: new Date(),
      ipAddress: item.input.ipAddress,
      userAgent: item.input.userAgent,
      pageUrl: item.input.pageUrl,
      referrer: item.input.referrer,
      utm: item.input.utm,
      attribution: item.input.attribution,
      processed: false,
    }));

    try {
      await AnalyticsEvent.insertMany(documents, { ordered: false });
      logger.debug({ count: documents.length }, "Analytics events batch saved");
    } catch (err: unknown) {
      const error = err as Error;
      logger.error({ error: error.message, count: documents.length }, "Failed to save analytics batch");

      const failed = batch.filter(item => item.retries < item.maxRetries);
      failed.forEach(item => {
        item.retries++;
        setTimeout(() => this.eventQueue.push(item), 1000 * item.retries);
      });
    }

    this.processing = false;
  }

  private startBatchProcessor(): void {
    this.intervalHandle = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.processBatch().catch(err => logger.error({ err }, "Batch processor error"));
      }
    }, this.BATCH_INTERVAL_MS);

    if (this.intervalHandle && typeof this.intervalHandle === "object") {
      this.intervalHandle.unref();
    }
  }

  async getEventCount(eventName: string, filters?: { from?: Date; to?: Date; orgId?: string }): Promise<number> {
    const query: Record<string, unknown> = { eventName };
    if (filters?.from || filters?.to) {
      query.timestamp = {};
      if (filters.from) (query.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (query.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) query.orgId = filters.orgId;

    return AnalyticsEvent.countDocuments(query);
  }

  async getEventsByCategory(category: string, filters?: { from?: Date; to?: Date; orgId?: string; limit?: number; skip?: number }) {
    const query: Record<string, unknown> = { eventCategory: category };
    if (filters?.from || filters?.to) {
      query.timestamp = {};
      if (filters.from) (query.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (query.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) query.orgId = filters.orgId;

    const [events, total] = await Promise.all([
      AnalyticsEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(filters?.skip || 0)
        .limit(filters?.limit || 50)
        .lean(),
      AnalyticsEvent.countDocuments(query),
    ]);

    return { events, total };
  }

  async getDashboardAnalytics(filters?: { from?: Date; to?: Date; orgId?: string }) {
    const match: Record<string, unknown> = {};
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) match.orgId = filters.orgId;

    const [totalEvents, categoryBreakdown, topEvents, dailyCounts] = await Promise.all([
      AnalyticsEvent.countDocuments(match),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$eventCategory", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        { $group: { _id: "$eventName", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 90 },
      ]),
    ]);

    const funnelData = await AnalyticsEvent.aggregate([
      { $match: { ...match, eventName: { $in: ["sign_up", "workspace_created", "onboarding_complete", "subscription_upgraded"] } } },
      {
        $group: {
          _id: "$eventName",
          uniqueUsers: { $addToSet: "$userId" },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      totalEvents,
      categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, count: c.count })),
      topEvents: topEvents.map(e => ({ event: e._id, count: e.count })),
      dailyEventCounts: dailyCounts.map(d => ({ date: d._id, count: d.count })),
      conversionFunnel: funnelData.map(f => ({
        event: f._id,
        count: f.count,
        uniqueUsers: f.uniqueUsers.length,
      })),
    };
  }

  async getFeatureAdoption(featureName: string, filters?: { from?: Date; to?: Date; orgId?: string }) {
    const match: Record<string, unknown> = {
      eventName: { $in: [`feature_${featureName}_used`, `feature_${featureName}_enabled`] },
    };
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }
    if (filters?.orgId) match.orgId = filters.orgId;

    const [usage, enabled] = await Promise.all([
      AnalyticsEvent.countDocuments({ ...match, eventName: `feature_${featureName}_used` }),
      AnalyticsEvent.countDocuments({ ...match, eventName: `feature_${featureName}_enabled` }),
    ]);

    return { featureName, usageCount: usage, enabledCount: enabled };
  }

  async getRetentionCohorts(filters?: { from?: Date; to?: Date; orgId?: string }) {
    const match: Record<string, unknown> = {};
    if (filters?.orgId) match.orgId = filters.orgId;

    const cohorts = await AnalyticsEvent.aggregate([
      { $match: { ...match, eventName: "sign_up" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$timestamp" } },
          users: { $addToSet: "$userId" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    return cohorts.map(c => ({
      cohort: c._id,
      signups: c.count,
      userIds: c.users,
    }));
  }

  async getErrorRate(filters?: { from?: Date; to?: Date }): Promise<number> {
    const match: Record<string, unknown> = { eventCategory: "error" };
    if (filters?.from || filters?.to) {
      match.timestamp = {};
      if (filters.from) (match.timestamp as Record<string, unknown>).$gte = filters.from;
      if (filters.to) (match.timestamp as Record<string, unknown>).$lte = filters.to;
    }

    const errorCount = await AnalyticsEvent.countDocuments(match);
    const totalCount = await AnalyticsEvent.countDocuments({ ...match, eventCategory: { $ne: "error" } });

    return totalCount > 0 ? Math.round((errorCount / totalCount) * 10000) / 100 : 0;
  }

  dispose(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
    if (this.eventQueue.length > 0) {
      this.processBatch().catch(() => {});
    }
  }
}

export const analyticsService = new AnalyticsService();
