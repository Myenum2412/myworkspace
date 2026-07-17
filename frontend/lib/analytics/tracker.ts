import { useConsentStore } from "../consent/store";
import { trackEvent, trackEvents } from "../consent/services";

type EventProperties = Record<string, unknown>;

const SESSION_ID = typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function getPageUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

function getReferrer(): string {
  if (typeof window === "undefined") return "";
  return document.referrer;
}

function getUTMParams(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  let hasUtm = false;
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const val = params.get(key);
    if (val) {
      utm[key.replace("utm_", "")] = val;
      hasUtm = true;
    }
  }
  return hasUtm ? utm : undefined;
}

export class Tracker {
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === "undefined") return;
    this.initialized = true;

    // Track page views
    this.trackPageView();

    // Track UTM on first visit
    const utm = getUTMParams();
    if (utm) {
      sessionStorage.setItem("utm_params", JSON.stringify(utm));
    }

    // Listen for consent updates
    window.addEventListener("consentUpdated", () => {
      this.flushQueued();
    });
  }

  track(eventName: string, properties?: EventProperties): void {
    const consent = useConsentStore.getState().consent;
    if (!consent) {
      this.queueEvent(eventName, properties);
      return;
    }

    const eventCategory = this.categorizeEvent(eventName);
    const requiredCategory = this.getConsentCategory(eventCategory);
    if (requiredCategory && !consent.categories[requiredCategory as keyof typeof consent.categories]) {
      return;
    }

    trackEvent({
      eventName,
      eventCategory,
      properties,
      sessionId: SESSION_ID,
      pageUrl: getPageUrl(),
      referrer: getReferrer(),
      utm: getUTMParams() as any,
    });
  }

  private trackPageView(): void {
    if (typeof window === "undefined") return;
    const prevUrl = sessionStorage.getItem("last_page_url");
    const currentUrl = getPageUrl();
    if (prevUrl !== currentUrl) {
      sessionStorage.setItem("last_page_url", currentUrl);
      this.track("page_view", { url: currentUrl, title: document.title });
    }
  }

  private queue: Array<{ eventName: string; properties?: EventProperties }> = [];

  private queueEvent(eventName: string, properties?: EventProperties): void {
    this.queue.push({ eventName, properties });
    if (this.queue.length >= 25) this.flushQueued();
  }

  private flushQueued(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    const consent = useConsentStore.getState().consent;
    if (!consent) return;

    const allowed = batch.filter(({ eventName }) => {
      const category = this.categorizeEvent(eventName);
      const required = this.getConsentCategory(category);
      return !required || consent.categories[required as keyof typeof consent.categories];
    });

    if (allowed.length > 0) {
      trackEvents(allowed.map(({ eventName, properties }) => ({
        eventName,
        eventCategory: this.categorizeEvent(eventName),
        properties,
      })));
    }
  }

  private categorizeEvent(eventName: string): string {
    if (eventName.startsWith("page_view") || eventName.startsWith("landing_")) return "engagement";
    if (eventName.startsWith("sign_up") || eventName.startsWith("login") || eventName.startsWith("logout")) return "auth";
    if (eventName.startsWith("onboarding")) return "onboarding";
    if (eventName.startsWith("workspace")) return "workspace";
    if (eventName.startsWith("project")) return "project";
    if (eventName.startsWith("file_")) return "file";
    if (eventName.startsWith("subscription") || eventName.startsWith("payment") || eventName.startsWith("trial")) return "subscription";
    if (eventName.startsWith("feature_")) return "feature";
    if (eventName.startsWith("ai_")) return "ai";
    if (eventName.startsWith("search")) return "search";
    if (eventName.startsWith("invitation") || eventName.startsWith("member") || eventName.startsWith("comment")) return "collaboration";
    if (eventName.startsWith("support") || eventName.startsWith("help_")) return "support";
    return "engagement";
  }

  private getConsentCategory(eventCategory: string): string | null {
    const map: Record<string, string> = {
      engagement: "analytics",
      auth: "essential",
      onboarding: "analytics",
      workspace: "analytics",
      project: "analytics",
      file: "analytics",
      subscription: "analytics",
      payment: "essential",
      feature: "analytics",
      ai: "analytics",
      search: "analytics",
      collaboration: "analytics",
      support: "functional",
    };
    return map[eventCategory] || "analytics";
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    this.track("identify", { userId, ...traits });
  }
}

export const tracker = new Tracker();

