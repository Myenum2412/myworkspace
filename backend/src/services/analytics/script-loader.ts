import { ConsentRecord } from "../../lib/db/models/ConsentRecord.js";
import type { ConsentCategories } from "../consent/consent.service.js";

export type ScriptCategory = "essential" | "functional" | "analytics" | "performance" | "personalization" | "marketing";

export interface ThirdPartyScript {
  id: string;
  name: string;
  category: ScriptCategory;
  src?: string;
  content?: string;
  async?: boolean;
  defer?: boolean;
  consentRequired: boolean;
  dataLayerPush?: string[];
}

const KNOWN_SCRIPTS: ThirdPartyScript[] = [
  { id: "ga4", name: "Google Analytics 4", category: "analytics", src: "https://www.googletagmanager.com/gtag/js?id=G-", async: true, defer: true, consentRequired: true, dataLayerPush: ["config", "event"] },
  { id: "gtm", name: "Google Tag Manager", category: "analytics", src: "https://www.googletagmanager.com/gtm.js?id=", async: true, defer: true, consentRequired: true },
  { id: "google-ads", name: "Google Ads Conversion", category: "marketing", src: "https://www.googletagmanager.com/gtag/js?id=AW-", async: true, defer: true, consentRequired: true },
  { id: "meta-pixel", name: "Meta Pixel", category: "marketing", src: "https://connect.facebook.net/en_US/fbevents.js", async: true, defer: true, consentRequired: true },
  { id: "linkedin", name: "LinkedIn Insight Tag", category: "analytics", src: "https://snap.licdn.com/li.lms-analytics/insight.min.js", async: true, defer: true, consentRequired: true },
  { id: "clarity", name: "Microsoft Clarity", category: "analytics", src: "https://www.clarity.ms/tag/", async: true, defer: true, consentRequired: true },
  { id: "hotjar", name: "Hotjar", category: "analytics", src: "https://static.hotjar.com/c/hotjar-", async: true, defer: true, consentRequired: true },
  { id: "intercom", name: "Intercom", category: "functional", src: "https://widget.intercom.io/widget/", async: true, defer: true, consentRequired: true },
  { id: "crisp", name: "Crisp Chat", category: "functional", src: "https://client.crisp.chat/l.js", async: true, defer: true, consentRequired: true },
  { id: "hubspot", name: "HubSpot Analytics", category: "marketing", src: "https://js.hs-scripts.com/", async: true, defer: true, consentRequired: true },
  { id: "amplitude", name: "Amplitude", category: "analytics", src: "https://cdn.amplitude.com/libs/analytics-browser-", async: true, defer: true, consentRequired: true },
  { id: "mixpanel", name: "Mixpanel", category: "analytics", src: "https://cdn.mxpnl.com/libs/mixpanel-", async: true, defer: true, consentRequired: true },
  { id: "fullstory", name: "FullStory", category: "analytics", src: "https://cdn.fullstory.com/s/fs.js", async: true, defer: true, consentRequired: true },
  { id: "stripe", name: "Stripe", category: "essential", src: "https://js.stripe.com/v3/", async: true, defer: true, consentRequired: false },
  { id: "recaptcha", name: "reCAPTCHA", category: "essential", src: "https://www.google.com/recaptcha/api.js", async: true, defer: true, consentRequired: false },
];

export class ScriptLoaderService {
  getScriptsForCategory(category: ScriptCategory): ThirdPartyScript[] {
    return KNOWN_SCRIPTS.filter(s => s.category === category);
  }

  getAllScripts(): ThirdPartyScript[] {
    return KNOWN_SCRIPTS;
  }

  getBlockedScripts(consent: { categories: ConsentCategories } | null): ThirdPartyScript[] {
    if (!consent) return KNOWN_SCRIPTS.filter(s => s.consentRequired);
    return KNOWN_SCRIPTS.filter(s => s.consentRequired && !consent.categories[s.category]);
  }

  getAllowedScripts(consent: { categories: ConsentCategories } | null): ThirdPartyScript[] {
    if (!consent) return KNOWN_SCRIPTS.filter(s => !s.consentRequired);
    return KNOWN_SCRIPTS.filter(s => !s.consentRequired || consent.categories[s.category]);
  }

  generateScriptTag(script: ThirdPartyScript, apiKey?: string): string {
    let src = script.src || "";
    if (apiKey && script.id === "ga4") src = `https://www.googletagmanager.com/gtag/js?id=${apiKey}`;
    if (apiKey && script.id === "gtm") src = `https://www.googletagmanager.com/gtm.js?id=${apiKey}`;

    const attrs = [
      `type="text/javascript"`,
      script.async ? "async" : "",
      script.defer ? "defer" : "",
      `id="script-${script.id}"`,
      `data-consent-category="${script.category}"`,
    ].filter(Boolean).join(" ");

    if (script.content) {
      return `<script ${attrs}>${script.content}</script>`;
    }
    if (src) {
      return `<script ${attrs} src="${src}"></script>`;
    }
    return "";
  }

  generateConsentAwareLoader(scripts: ThirdPartyScript[], consentEndpoint: string): string {
    const scriptDefs = JSON.stringify(scripts.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      src: s.src,
      consentRequired: s.consentRequired,
    })));

    return `
(function() {
  var scripts = ${scriptDefs};
  var consentEndpoint = "${consentEndpoint}";

  function loadScript(scriptDef) {
    if (document.getElementById('script-' + scriptDef.id)) return;
    var el = document.createElement('script');
    el.id = 'script-' + scriptDef.id;
    el.async = true;
    el.defer = true;
    el.setAttribute('data-consent-category', scriptDef.category);
    if (scriptDef.src) el.src = scriptDef.src;
    if (scriptDef.content) el.textContent = scriptDef.content;
    document.head.appendChild(el);
  }

  function getConsent() {
    try {
      var stored = localStorage.getItem('consent_preferences');
      return stored ? JSON.parse(stored) : null;
    } catch(e) { return null; }
  }

  function applyConsent() {
    var consent = getConsent();
    scripts.forEach(function(s) {
      if (!s.consentRequired) { loadScript(s); return; }
      if (consent && consent.categories && consent.categories[s.category]) {
        loadScript(s);
      }
    });
  }

  applyConsent();
  window.addEventListener('consentUpdated', applyConsent);
})();
`;
  }
}

export const scriptLoaderService = new ScriptLoaderService();
