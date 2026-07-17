/**
 * Consent-aware third-party script loader.
 * Only injects scripts for categories the user has consented to.
 */
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    lintrk?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
    _paq?: unknown[];
    hj?: (...args: unknown[]) => void;
    Intercom?: (...args: unknown[]) => void;
  }
}

type ScriptCategory = "essential" | "functional" | "analytics" | "performance" | "personalization" | "marketing";

interface ScriptDefinition {
  id: string;
  src?: string;
  category: ScriptCategory;
  consentRequired: boolean;
  init?: () => void;
  content?: string;
}

const SCRIPTS: ScriptDefinition[] = [
  { id: "gtm", src: "https://www.googletagmanager.com/gtm.js?id=GTM-XXXXX", category: "analytics", consentRequired: true },
  { id: "ga4", src: "https://www.googletagmanager.com/gtag/js?id=G-XXXXX", category: "analytics", consentRequired: true },
  { id: "meta-pixel", src: "https://connect.facebook.net/en_US/fbevents.js", category: "marketing", consentRequired: true },
  { id: "linkedin", src: "https://snap.licdn.com/li.lms-analytics/insight.min.js", category: "analytics", consentRequired: true },
  { id: "clarity", src: "https://www.clarity.ms/tag/XXXXX", category: "analytics", consentRequired: true },
  { id: "hotjar", src: "https://static.hotjar.com/c/hotjar-XXXXX.js", category: "analytics", consentRequired: true },
  { id: "intercom", src: "https://widget.intercom.io/widget/XXXXX", category: "functional", consentRequired: true },
  { id: "stripe", src: "https://js.stripe.com/v3/", category: "essential", consentRequired: false },
  { id: "recaptcha", src: "https://www.google.com/recaptcha/api.js", category: "essential", consentRequired: false },
];

let loaded = new Set<string>();

export function injectScript(script: ScriptDefinition): void {
  if (loaded.has(script.id) || document.getElementById(`script-${script.id}`)) return;
  if (script.content) {
    const el = document.createElement("script");
    el.id = `script-${script.id}`;
    el.textContent = script.content;
    document.head.appendChild(el);
  } else if (script.src) {
    const el = document.createElement("script");
    el.id = `script-${script.id}`;
    el.src = script.src;
    el.async = true;
    el.defer = true;
    document.head.appendChild(el);
  }
  loaded.add(script.id);
}

export function removeScript(id: string): void {
  const el = document.getElementById(`script-${id}`);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
    loaded.delete(id);
  }
}

export function applyConsent(categories: { essential?: boolean; functional?: boolean; analytics?: boolean; performance?: boolean; personalization?: boolean; marketing?: boolean }): void {
  if (typeof window === "undefined") return;

  for (const script of SCRIPTS) {
    if (!script.consentRequired) {
      injectScript(script);
    } else if (categories[script.category]) {
      injectScript(script);
    } else {
      removeScript(script.id);
    }
  }
}

export function getScriptsForCategory(category: ScriptCategory): ScriptDefinition[] {
  return SCRIPTS.filter(s => s.category === category);
}

export function getAllScripts(): ScriptDefinition[] {
  return SCRIPTS;
}
