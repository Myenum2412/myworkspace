import { Schema, model, Document } from "mongoose";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";

export interface ISSOConfig extends Document {
  tenantId: string;
  provider: "oidc" | "saml" | "google" | "microsoft" | "github";
  clientId: string;
  clientSecret: string;
  issuerUrl?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  userInfoUrl?: string;
  jwksUrl?: string;
  redirectUri: string;
  scopes: string[];
  attributeMapping: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ssoConfigSchema = new Schema<ISSOConfig>({
  tenantId: { type: String, required: true, index: true },
  provider: {
    type: String, enum: ["oidc", "saml", "google", "microsoft", "github"],
    required: true,
  },
  clientId: { type: String, required: true },
  clientSecret: { type: String, required: true },
  issuerUrl: { type: String },
  authorizationUrl: { type: String },
  tokenUrl: { type: String },
  userInfoUrl: { type: String },
  jwksUrl: { type: String },
  redirectUri: { type: String, required: true },
  scopes: { type: [String], default: ["openid", "profile", "email"] },
  attributeMapping: { type: Schema.Types.Mixed, default: { name: "name", email: "email" } },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

ssoConfigSchema.index({ tenantId: 1, provider: 1 }, { unique: true });

export const SSOConfig = model<ISSOConfig>("SSOConfig", ssoConfigSchema);

export interface SSOUser {
  id: string;
  email: string;
  name: string;
  provider: string;
  providerAccountId: string;
  avatar?: string;
}

export class SSOManager {
  async getProvider(tenantId: string, provider: string): Promise<any | null> {
    return SSOConfig.findOne({ tenantId, provider, isActive: true }).lean();
  }

  async getProviders(tenantId: string): Promise<any[]> {
    return SSOConfig.find({ tenantId, isActive: true }).lean();
  }

  async createOrUpdateProvider(
    tenantId: string,
    config: Omit<ISSOConfig, "_id" | "createdAt" | "updatedAt">,
  ): Promise<any> {
    return SSOConfig.findOneAndUpdate(
      { tenantId, provider: config.provider },
      { $set: { ...config, updatedAt: new Date() } },
      { upsert: true, new: true },
    ).lean();
  }

  async deactivateProvider(tenantId: string, provider: string): Promise<void> {
    await SSOConfig.updateOne(
      { tenantId, provider },
      { $set: { isActive: false, updatedAt: new Date() } },
    );
  }

  generateState(redirectUri?: string): { state: string; nonce: string } {
    return {
      state: crypto.randomBytes(32).toString("hex"),
      nonce: crypto.randomBytes(32).toString("hex"),
    };
  }

  async mapUser(
    provider: ISSOConfig,
    profile: Record<string, unknown>,
  ): Promise<SSOUser> {
    const mapping = provider.attributeMapping;
    return {
      id: uuid(),
      email: String(profile[mapping.email] || profile.email || ""),
      name: String(profile[mapping.name] || profile.name || ""),
      provider: provider.provider,
      providerAccountId: String(profile.sub || profile.id || ""),
      avatar: profile.picture as string || profile.avatar as string,
    };
  }
}

export const ssoManager = new SSOManager();
