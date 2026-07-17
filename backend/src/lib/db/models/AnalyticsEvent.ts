import mongoose, { Schema, model } from "mongoose";

export interface IAnalyticsEvent {
  id: string;
  eventName: string;
  eventCategory: string;
  userId?: string;
  orgId?: string;
  anonymousId?: string;
  sessionId?: string;
  properties: Record<string, unknown>;
  consentCategories: string[];
  timestamp: Date;
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
  processed: boolean;
  createdAt: Date;
}

const analyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    id: { type: String, required: true, unique: true },
    eventName: { type: String, required: true, index: true },
    eventCategory: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    orgId: { type: String, index: true },
    anonymousId: { type: String, index: true },
    sessionId: String,
    properties: { type: Schema.Types.Mixed, default: {} },
    consentCategories: [{ type: String }],
    timestamp: { type: Date, required: true, default: Date.now },
    ipAddress: String,
    userAgent: String,
    pageUrl: String,
    referrer: String,
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },
    attribution: {
      firstTouch: String,
      lastTouch: String,
      channel: String,
      campaign: String,
    },
    processed: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

analyticsEventSchema.index({ eventName: 1, timestamp: -1 });
analyticsEventSchema.index({ orgId: 1, eventCategory: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 });
analyticsEventSchema.index({ "utm.source": 1, timestamp: -1 });
analyticsEventSchema.index({ "attribution.channel": 1, timestamp: -1 });

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent || model("AnalyticsEvent", analyticsEventSchema, "analytics_events");
