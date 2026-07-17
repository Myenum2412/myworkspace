import { ConsentCategories } from "./store";

const API_BASE = "/api";

export async function fetchConsentStatus() {
  const res = await fetch(`${API_BASE}/consent/current`, { credentials: "include" });
  return res.json();
}

export async function saveConsent(categories: ConsentCategories, source = "banner") {
  const res = await fetch(`${API_BASE}/consent/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ categories, source, policyVersion: 1 }),
  });
  return res.json();
}

export async function withdrawConsent() {
  const res = await fetch(`${API_BASE}/consent/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  return res.json();
}

export async function getConsentHistory() {
  const res = await fetch(`${API_BASE}/consent/history`, { credentials: "include" });
  return res.json();
}

export async function getConsentAuditLogs(params?: { page?: number; limit?: number; action?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.action) query.set("action", params.action);
  const res = await fetch(`${API_BASE}/consent/audit-logs?${query}`, { credentials: "include" });
  return res.json();
}

// ── Analytics API ──

export async function trackEvent(event: {
  eventName: string;
  eventCategory: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
  pageUrl?: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
}) {
  try {
    await fetch(`${API_BASE}/analytics/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(event),
    });
  } catch {
    // silently fail - analytics should never block the UI
  }
}

export async function trackEvents(events: Array<{
  eventName: string;
  eventCategory: string;
  properties?: Record<string, unknown>;
}>) {
  try {
    await fetch(`${API_BASE}/analytics/track/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ events }),
    });
  } catch {
    // silently fail
  }
}
