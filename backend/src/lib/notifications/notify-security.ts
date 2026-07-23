import { createNotification } from "../../services/notification.service.js";

export const notifySecurity = {
  async suspiciousLogin(userId: string, orgId: string, location: string, device: string, ipAddress: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "suspicious_login", category: "security", priority: "critical",
      title: "Suspicious Login Detected",
      message: `Unusual login detected from ${location} using ${device} (${ipAddress})`,
      actions: [
        { label: "Secure Account", action: "view", url: "/settings/security", primary: true },
        { label: "Review Activity", action: "view", url: "/settings/security" },
      ],
      metadata: { location, device, ipAddress },
    });
  },

  async emailChanged(userId: string, orgId: string, oldEmail: string, newEmail: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "email_changed", category: "security", priority: "high",
      title: "Email Address Changed",
      message: `Your email was changed from ${oldEmail} to ${newEmail}`,
      actions: [{ label: "Review Changes", action: "view", url: "/settings/security", primary: true }],
      metadata: { oldEmail, newEmail },
    });
  },

  async apiAbuseDetected(userId: string, orgId: string, endpoint: string, reason: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "api_abuse_detected", category: "security", priority: "high",
      title: "API Abuse Detected",
      message: `Suspicious API activity detected on ${endpoint}: ${reason}`,
      actions: [{ label: "Review API Keys", action: "view", url: "/settings/developer", primary: true }],
      metadata: { endpoint, reason },
    });
  },

  async rateLimitExceeded(userId: string, orgId: string, endpoint: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "rate_limit_exceeded", category: "security",
      title: "Rate Limit Exceeded",
      message: `API rate limit exceeded for ${endpoint}. Requests have been throttled.`,
      metadata: { endpoint },
    });
  },

  async unauthorizedAccessAttempt(userId: string, orgId: string, resource: string, ipAddress: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "unauthorized_access_attempt", category: "security", priority: "critical",
      title: "Unauthorized Access Attempt",
      message: `Blocked unauthorized access to "${resource}" from ${ipAddress}`,
      actions: [{ label: "Review Security Logs", action: "view", url: "/admin/security", primary: true }],
      metadata: { resource, ipAddress },
    });
  },
};
