import { Request } from "express";
import geoip from "geoip-lite";

export interface RegionInfo {
  region: string;
  gdprApplies: boolean;
  ccpaApplies: boolean;
  lgpdApplies: boolean;
  pipedaApplies: boolean;
  cookieExpiryDays: number;
  requiresExplicitConsent: boolean;
  requiresDataExportSupport: boolean;
  requiresDataDeletionSupport: boolean;
}

const GDPR_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "CH",
  "GB", "GI",
]);

const CCPA_STATES = new Set(["US-CA"]);

const LGPD_COUNTRY = new Set(["BR"]);

const PIPEDA_COUNTRY = new Set(["CA"]);

export function detectRegion(ip: string, headers?: Record<string, string>): RegionInfo {
  let country = "US";
  let region = "US";

  const cfIpCountry = headers?.["cf-ipcountry"];
  if (cfIpCountry && cfIpCountry.length === 2) {
    country = cfIpCountry.toUpperCase();
    region = country;
  } else {
    const geo = geoip.lookup(ip);
    if (geo) {
      country = geo.country;
      region = geo.region ? `${geo.country}-${geo.region}` : geo.country;
    }
  }

  const gdprApplies = GDPR_COUNTRIES.has(country);
  const ccpaApplies = CCPA_STATES.has(region);
  const lgpdApplies = LGPD_COUNTRY.has(country);
  const pipedaApplies = PIPEDA_COUNTRY.has(country);

  let cookieExpiryDays = 365;
  let requiresExplicitConsent = false;
  let requiresDataExportSupport = false;
  let requiresDataDeletionSupport = false;

  if (gdprApplies) {
    cookieExpiryDays = 180;
    requiresExplicitConsent = true;
    requiresDataExportSupport = true;
    requiresDataDeletionSupport = true;
  }
  if (ccpaApplies) {
    cookieExpiryDays = Math.min(cookieExpiryDays, 365);
    requiresDataExportSupport = true;
    requiresDataDeletionSupport = true;
  }
  if (lgpdApplies) {
    cookieExpiryDays = Math.min(cookieExpiryDays, 180);
    requiresExplicitConsent = true;
    requiresDataExportSupport = true;
    requiresDataDeletionSupport = true;
  }
  if (pipedaApplies) {
    cookieExpiryDays = Math.min(cookieExpiryDays, 365);
    requiresDataExportSupport = true;
    requiresDataDeletionSupport = true;
  }

  return {
    region,
    gdprApplies,
    ccpaApplies,
    lgpdApplies,
    pipedaApplies,
    cookieExpiryDays,
    requiresExplicitConsent,
    requiresDataExportSupport,
    requiresDataDeletionSupport,
  };
}

export function detectRegionFromRequest(req: Request): RegionInfo {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "127.0.0.1";
  return detectRegion(ip, req.headers as Record<string, string>);
}
