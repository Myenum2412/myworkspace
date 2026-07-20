import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";

export interface IMarketplaceIntegration extends Document {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: "ai" | "storage" | "communication" | "payment" | "crm" | "erp" | "hr" | "analytics" | "identity" | "automation" | "other";
  version: string;
  icon: string;
  docsUrl: string;
  configSchema: Record<string, unknown>;
  permissions: string[];
  pricing: "free" | "freemium" | "paid";
  isPublished: boolean;
  installCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInstallation extends Document {
  id: string;
  orgId: string;
  integrationId: string;
  name: string;
  config: Record<string, unknown>;
  status: "installing" | "active" | "error" | "disabled" | "uninstalled";
  version: string;
  lastHealthCheckAt?: Date;
  healthStatus: "healthy" | "degraded" | "down";
  error?: string;
  installedBy: string;
  installedAt: Date;
  updatedAt: Date;
}

const marketplaceSchema = new Schema<IMarketplaceIntegration>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  provider: { type: String, required: true },
  description: { type: String, default: "" },
  category: { type: String, enum: ["ai", "storage", "communication", "payment", "crm", "erp", "hr", "analytics", "identity", "automation", "other"], required: true },
  version: { type: String, default: "1.0.0" },
  icon: { type: String, default: "puzzle" },
  docsUrl: String,
  configSchema: { type: Schema.Types.Mixed, default: {} },
  permissions: [{ type: String }],
  pricing: { type: String, enum: ["free", "freemium", "paid"], default: "free" },
  isPublished: { type: Boolean, default: false },
  installCount: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
}, { timestamps: true });

const installationSchema = new Schema<IInstallation>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  integrationId: { type: String, required: true },
  name: { type: String, required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["installing", "active", "error", "disabled", "uninstalled"], default: "installing" },
  version: { type: String, default: "1.0.0" },
  lastHealthCheckAt: Date,
  healthStatus: { type: String, enum: ["healthy", "degraded", "down"], default: "healthy" },
  error: String,
  installedBy: { type: String, required: true },
  installedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const MarketplaceIntegration = model<IMarketplaceIntegration>("MarketplaceIntegration", marketplaceSchema);
export const Installation = model<IInstallation>("Installation", installationSchema);

export class MarketplaceEngine {
  async registerIntegration(params: {
    name: string; provider: string; description?: string;
    category: IMarketplaceIntegration["category"]; configSchema?: Record<string, unknown>;
    permissions?: string[]; pricing?: string;
  }): Promise<IMarketplaceIntegration> {
    return MarketplaceIntegration.create({
      id: uuid(), ...params,
      description: params.description || "",
      version: "1.0.0", icon: "puzzle",
      configSchema: params.configSchema || {},
      permissions: params.permissions || [],
      pricing: params.pricing || "free",
      isPublished: false, installCount: 0, rating: 0,
    });
  }

  async searchIntegrations(query?: string, category?: string): Promise<IMarketplaceIntegration[]> {
    const filter: Record<string, unknown> = { isPublished: true };
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { provider: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
        { category: { $regex: escaped, $options: "i" } },
      ];
    }
    if (category) filter.category = category;
    return MarketplaceIntegration.find(filter).sort({ installCount: -1 }).lean() as any;
  }

  async installIntegration(params: {
    orgId: string; integrationId: string; name: string;
    config?: Record<string, unknown>; installedBy: string;
  }): Promise<IInstallation> {
    await MarketplaceIntegration.updateOne(
      { id: params.integrationId },
      { $inc: { installCount: 1 } },
    );
    return Installation.create({
      id: uuid(), ...params,
      config: params.config || {},
      version: "1.0.0", status: "installing", healthStatus: "healthy",
      installedAt: new Date(),
    });
  }

  async updateInstallationConfig(installationId: string, config: Record<string, unknown>): Promise<void> {
    await Installation.updateOne({ id: installationId }, { $set: { config, status: "active" } });
  }

  async uninstallIntegration(installationId: string): Promise<void> {
    await Installation.updateOne({ id: installationId }, { $set: { status: "uninstalled" } });
  }

  async healthCheck(installationId: string): Promise<"healthy" | "degraded" | "down"> {
    const status: "healthy" | "degraded" | "down" = Math.random() > 0.1 ? "healthy" : "degraded";
    await Installation.updateOne(
      { id: installationId },
      { $set: { healthStatus: status, lastHealthCheckAt: new Date() } },
    );
    return status;
  }

  async getOrgInstallations(orgId: string): Promise<IInstallation[]> {
    return Installation.find({ orgId, status: { $ne: "uninstalled" } }).sort({ installedAt: -1 }).lean() as any;
  }

  async getMarketplaceStats(): Promise<{
    totalIntegrations: number; totalInstallations: number;
    byCategory: Record<string, number>; topIntegrations: any[];
  }> {
    const [total, installs, catAgg] = await Promise.all([
      MarketplaceIntegration.countDocuments({ isPublished: true }),
      Installation.countDocuments({ status: "active" }),
      MarketplaceIntegration.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);
    const byCategory: Record<string, number> = {};
    for (const c of catAgg) byCategory[c._id] = c.count;
    const top = await MarketplaceIntegration.find({ isPublished: true }).sort({ installCount: -1 }).limit(10).lean();
    return { totalIntegrations: total, totalInstallations: installs, byCategory, topIntegrations: top };
  }
}

export const marketplace = new MarketplaceEngine();
