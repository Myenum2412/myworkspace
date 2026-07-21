import crypto from "crypto";

export interface RiskContext {
  ipAddress?: string;
  userAgent?: string;
  email?: string;
  userId?: string;
  failedAttempts?: number;
  previousLoginAt?: Date;
  previousIpAddress?: string;
  deviceFingerprint?: string;
  orgId?: string;
}

export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  factors: RiskFactor[];
  requiresMfa: boolean;
  requiresStepUp: boolean;
}

export interface RiskFactor {
  name: string;
  score: number;
  detail: string;
}

const MAX_SCORE = 100;

export async function evaluateLoginRisk(context: RiskContext): Promise<RiskResult> {
  const factors: RiskFactor[] = [];
  let score = 0;

  const ipRisk = assessIpRisk(context.ipAddress);
  if (ipRisk) { factors.push(ipRisk); score += ipRisk.score; }

  const failedAttemptsRisk = assessFailedAttempts(context.failedAttempts);
  if (failedAttemptsRisk) { factors.push(failedAttemptsRisk); score += failedAttemptsRisk.score; }

  const userAgentRisk = assessUserAgent(context.userAgent);
  if (userAgentRisk) { factors.push(userAgentRisk); score += userAgentRisk.score; }

  const geoChangeRisk = assessGeoChange(context);
  if (geoChangeRisk) { factors.push(geoChangeRisk); score += geoChangeRisk.score; }

  const deviceRisk = assessDeviceHistory(context);
  if (deviceRisk) { factors.push(deviceRisk); score += deviceRisk.score; }

  const anomalyRisk = assessTimeAnomaly(context);
  if (anomalyRisk) { factors.push(anomalyRisk); score += anomalyRisk.score; }

  score = Math.min(score, MAX_SCORE);

  const level = score <= 20 ? "low" : score <= 50 ? "medium" : score <= 75 ? "high" : "critical";

  return {
    score,
    level,
    factors,
    requiresMfa: score >= 30,
    requiresStepUp: score >= 60,
  };
}

function assessIpRisk(ipAddress?: string): RiskFactor | null {
  if (!ipAddress) {
    return { name: "missing_ip", score: 5, detail: "IP address not available" };
  }

  const privateIpPatterns = [
    /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./,
    /^127\./, /^::1$/, /^fc00:/, /^fe80:/,
  ];

  for (const pattern of privateIpPatterns) {
    if (pattern.test(ipAddress)) return null;
  }

  return null;
}

function assessFailedAttempts(attempts?: number): RiskFactor | null {
  if (!attempts || attempts === 0) return null;

  if (attempts >= 5) {
    return { name: "multiple_failures", score: 30, detail: `${attempts} failed login attempts` };
  }
  if (attempts >= 3) {
    return { name: "repeated_failures", score: 15, detail: `${attempts} failed login attempts` };
  }
  return { name: "failed_attempts", score: 5, detail: `${attempts} failed login attempts` };
}

function assessUserAgent(userAgent?: string): RiskFactor | null {
  if (!userAgent) {
    return { name: "missing_user_agent", score: 10, detail: "No user agent provided" };
  }

  const ua = userAgent.toLowerCase();
  const suspiciousPatterns = [
    { pattern: /curl|wget|python-requests|go-http|java|okhttp/i, score: 15, name: "programmatic_access" },
    { pattern: /phantomjs|headless/i, score: 20, name: "headless_browser" },
  ];

  for (const sp of suspiciousPatterns) {
    if (sp.pattern.test(ua)) {
      return { name: sp.name, score: sp.score, detail: `Suspicious user agent: ${userAgent.slice(0, 80)}` };
    }
  }

  if (ua.length < 20) {
    return { name: "minimal_user_agent", score: 5, detail: "Incomplete user agent" };
  }

  return null;
}

function assessGeoChange(context: RiskContext): RiskFactor | null {
  if (!context.previousLoginAt || !context.previousIpAddress) return null;
  if (!context.ipAddress) return null;

  const hoursSinceLastLogin = (Date.now() - context.previousLoginAt.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastLogin < 1 && context.ipAddress !== context.previousIpAddress) {
    return {
      name: "impossible_travel",
      score: 40,
      detail: `Login from different IP within ${Math.round(hoursSinceLastLogin * 60)} minutes`,
    };
  }

  return null;
}

function assessDeviceHistory(context: RiskContext): RiskFactor | null {
  if (!context.deviceFingerprint) return { name: "no_device_fingerprint", score: 5, detail: "No device identifier" };
  return null;
}

function assessTimeAnomaly(context: RiskContext): RiskFactor | null {
  const hour = new Date().getHours();
  if (hour >= 0 && hour <= 5) {
    return { name: "unusual_login_time", score: 10, detail: `Login at unusual hour: ${hour}:00` };
  }
  return null;
}

export function computeSessionHash(userId: string, ipAddress: string, userAgent: string): string {
  const input = `${userId}|${ipAddress}|${userAgent}|${Date.now()}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 32);
}
