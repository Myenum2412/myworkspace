import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { logger } from "../logger/index.js";

export interface IApiKey extends Document {
  id: string;
  orgId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  rateLimit: number;
  allowedIPs: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdBy: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebhookEndpoint extends Document {
  id: string;
  orgId: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  retryCount: number;
  timeout: number;
  isActive: boolean;
  lastTriggeredAt: Date | null;
  lastFailedAt: Date | null;
  createdBy: string;
  createdAt: Date;
}

const apiKeySchema = new Schema<IApiKey>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  keyPrefix: { type: String, required: true },
  keyHash: { type: String, required: true },
  scopes: [{ type: String }],
  rateLimit: { type: Number, default: 100 },
  allowedIPs: [{ type: String }],
  expiresAt: { type: Date, default: null },
  lastUsedAt: Date,
  createdBy: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const webhookEndpointSchema = new Schema<IWebhookEndpoint>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  url: { type: String, required: true },
  secret: { type: String, required: true },
  events: [{ type: String }],
  retryCount: { type: Number, default: 3 },
  timeout: { type: Number, default: 5000 },
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: Date,
  lastFailedAt: Date,
  createdBy: { type: String, required: true },
}, { timestamps: true });

export const ApiKey = model<IApiKey>("ApiKey", apiKeySchema);
export const WebhookEndpoint = model<IWebhookEndpoint>("WebhookEndpoint", webhookEndpointSchema);

export class DeveloperPortal {
  async createApiKey(params: {
    orgId: string; name: string; scopes?: string[];
    rateLimit?: number; allowedIPs?: string[];
    expiresAt?: Date | null; createdBy: string;
  }): Promise<{ apiKey: IApiKey; rawKey: string }> {
    const rawKey = `dp_${crypto.randomBytes(32).toString("hex")}`;
    const keyPrefix = rawKey.substring(0, 10);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const apiKey = await ApiKey.create({
      id: uuid(),
      orgId: params.orgId,
      name: params.name,
      keyPrefix,
      keyHash,
      scopes: params.scopes || ["read"],
      rateLimit: params.rateLimit || 100,
      allowedIPs: params.allowedIPs || [],
      expiresAt: params.expiresAt || null,
      createdBy: params.createdBy,
    });

    return { apiKey, rawKey };
  }

  async validateApiKey(rawKey: string, ip?: string): Promise<IApiKey | null> {
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const key = await ApiKey.findOne({ keyHash, isActive: true }).lean();
    if (!key) return null;

    if (key.expiresAt && new Date() > key.expiresAt) return null;
    if (key.allowedIPs?.length && ip && !key.allowedIPs.includes(ip)) return null;

    await ApiKey.updateOne({ id: key.id }, { lastUsedAt: new Date() });
    return key as any;
  }

  async createWebhookEndpoint(params: {
    orgId: string; name: string; url: string;
    events: string[]; createdBy: string;
  }): Promise<IWebhookEndpoint> {
    const secret = crypto.randomBytes(32).toString("hex");
    return WebhookEndpoint.create({
      id: uuid(),
      ...params,
      secret,
      retryCount: 3,
      timeout: 5000,
    });
  }

  async dispatchWebhook(orgId: string, event: string, payload: unknown): Promise<void> {
    const endpoints = await WebhookEndpoint.find({ orgId, events: event, isActive: true }).lean();
    for (const ep of endpoints) {
      this.sendWebhookWithRetry(ep, event, payload).catch(() => {});
    }
  }

  private async sendWebhookWithRetry(
    endpoint: any, event: string, payload: unknown,
    attempt = 0,
  ): Promise<void> {
    try {
      const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
      const signature = crypto
        .createHmac("sha256", endpoint.secret)
        .update(body)
        .digest("hex");

      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": event,
        },
        body,
        signal: AbortSignal.timeout(endpoint.timeout || 5000),
      });

      if (res.ok) {
        await WebhookEndpoint.updateOne({ id: endpoint.id }, { lastTriggeredAt: new Date() });
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      if (attempt < (endpoint.retryCount || 3)) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        return this.sendWebhookWithRetry(endpoint, event, payload, attempt + 1);
      }
      await WebhookEndpoint.updateOne({ id: endpoint.id }, { lastFailedAt: new Date() });
      logger.error({ endpointId: endpoint.id, event, error: (err as Error).message }, "Webhook delivery failed");
    }
  }

  async getDeveloperDashboard(orgId: string): Promise<{
    apiKeys: number; activeKeys: number;
    webhooks: number; activeWebhooks: number;
  }> {
    const [apiKeys, activeKeys, webhooks, activeWebhooks] = await Promise.all([
      ApiKey.countDocuments({ orgId }),
      ApiKey.countDocuments({ orgId, isActive: true }),
      WebhookEndpoint.countDocuments({ orgId }),
      WebhookEndpoint.countDocuments({ orgId, isActive: true }),
    ]);
    return { apiKeys, activeKeys, webhooks, activeWebhooks };
  }
}

export const developerPortal = new DeveloperPortal();
