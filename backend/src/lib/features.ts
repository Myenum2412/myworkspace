import { logger } from "./logger/index.js";

interface FeatureFlag {
  key: string;
  description: string;
  defaultEnabled: boolean;
  tenantOverrides: Map<string, boolean>;
  rolloutPercentage: number;
}

const features = new Map<string, FeatureFlag>();

export function defineFeature(
  key: string,
  description: string,
  defaultEnabled = false,
  rolloutPercentage = 100,
): FeatureFlag {
  const flag: FeatureFlag = {
    key,
    description,
    defaultEnabled,
    tenantOverrides: new Map(),
    rolloutPercentage,
  };
  features.set(key, flag);
  return flag;
}

export function isFeatureEnabled(tenantId: string, featureKey: string): boolean {
  const feature = features.get(featureKey);
  if (!feature) return false;

  const tenantOverride = feature.tenantOverrides.get(tenantId);
  if (tenantOverride !== undefined) return tenantOverride;

  return feature.defaultEnabled;
}

export function enableForTenant(tenantId: string, featureKey: string): void {
  const feature = features.get(featureKey);
  if (feature) feature.tenantOverrides.set(tenantId, true);
}

export function disableForTenant(tenantId: string, featureKey: string): void {
  const feature = features.get(featureKey);
  if (feature) feature.tenantOverrides.set(tenantId, false);
}

export function getAllFeatures(): FeatureFlag[] {
  return Array.from(features.values());
}

export function getFeature(key: string): FeatureFlag | undefined {
  return features.get(key);
}

export const Features = {
  ANALYTICS_DASHBOARD: defineFeature("analytics-dashboard", "Advanced analytics dashboard", true),
  SEARCH_V2: defineFeature("search-v2", "Enhanced search with fuzzy matching", true),
  STREAMING_V2: defineFeature("streaming-v2", "Enhanced streaming with range requests", true),
  REFRESH_TOKENS: defineFeature("refresh-tokens", "Refresh token rotation", true),
  OFFLINE_MODE: defineFeature("offline-mode", "Offline-first support", false, 10),
  REAL_TIME_COLLAB: defineFeature("real-time-collab", "Real-time collaborative editing", false, 25),
  ADVANCED_RBAC: defineFeature("advanced-rbac", "Fine-grained RBAC with ABAC support", true),
  AUDIT_TRAIL: defineFeature("audit-trail", "Immutable audit trail", true),
  DATA_EXPORT: defineFeature("data-export", "Bulk data export", true),
  WEBHOOKS: defineFeature("webhooks", "Outgoing webhook notifications", false, 50),
  SSO_SAML: defineFeature("sso-saml", "SAML-based SSO", false, 5),
  API_RATE_LIMITING: defineFeature("api-rate-limiting", "Per-tenant API rate limiting", true),
  BULK_OPERATIONS: defineFeature("bulk-operations", "Bulk file/task operations", true),
  CUSTOM_BRANDING: defineFeature("custom-branding", "Tenant-specific branding", false, 5),
};

export function initializeFeatures(): void {
  logger.info({ featureCount: features.size }, "Feature flags initialized");
}
