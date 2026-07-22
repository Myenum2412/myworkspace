"use client";

import { useEffect } from "react";
import { X, Cookie, Shield } from "lucide-react";
import { useConsentStore } from "@/lib/consent/store";
import { applyConsent } from "@/lib/analytics/script-loader";
import { tracker } from "@/lib/analytics/tracker";
import { Button } from "@/components/ui/button";

const CATEGORY_LABELS: Record<string, { title: string; description: string }> = {
  essential: {
    title: "Essential",
    description: "Required for the website to function. Cannot be disabled.",
  },
  functional: {
    title: "Functional",
    description: "Enables enhanced functionality like live chat and support.",
  },
  analytics: {
    title: "Analytics",
    description: "Helps us understand how visitors interact with the platform.",
  },
  performance: {
    title: "Performance",
    description: "Tracks performance metrics to improve speed and reliability.",
  },
  personalization: {
    title: "Personalization",
    description: "Remembers your preferences for a tailored experience.",
  },
  marketing: {
    title: "Marketing",
    description: "Used for marketing campaigns and retargeting.",
  },
};

export function CookieBanner() {
  const { consent, showBanner, showPreferences, setShowPreferences, acceptAll, rejectNonEssential, savePreferences, init, initialized } = useConsentStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (consent?.categories) {
      applyConsent(consent.categories);
    }
  }, [consent]);

  useEffect(() => {
    tracker.init();
  }, []);

  useEffect(() => {
    const handler = () => {
      const state = useConsentStore.getState();
      if (state.consent?.categories) {
        applyConsent(state.consent.categories);
      }
    };
    window.addEventListener("consentUpdated", handler);
    return () => window.removeEventListener("consentUpdated", handler);
  }, []);

  if (!initialized) return null;

  return (
    <>
      {/* Banner */}
      {showBanner && !showPreferences && consent === null && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
          <div className="mx-auto max-w-6xl bg-white dark:bg-gray-900 rounded-sm shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex items-start gap-4">
                <div className="hidden md:flex size-12 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                  <Cookie className="size-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      We value your privacy
                    </h3>
                    <button
                      onClick={() => useConsentStore.getState().setShowBanner(false)}
                      className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
                    We use cookies and similar technologies to enhance your browsing experience,
                    analyze website traffic, personalize content, and serve targeted advertisements.
                    You can customize your preferences or accept all cookies.{" "}
                    <a
                      href="/privacy/cookies"
                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      Learn more
                    </a>
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={acceptAll} size="sm">
                  Accept All
                </Button>
                <Button onClick={rejectNonEssential} variant="outline" size="sm">
                  Reject Non-Essential
                </Button>
                <Button
                  onClick={() => setShowPreferences(true)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500"
                >
                  <Shield className="size-3.5 mr-1.5" />
                  Customize
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-sm shadow-2xl border border-gray-200 dark:border-gray-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="size-5 text-primary" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Cookie Preferences
                </h3>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Manage your cookie preferences below. Essential cookies are always enabled
                as they are required for the platform to function.
              </p>

              {(["essential", "functional", "analytics", "performance", "personalization", "marketing"] as const).map((key) => {
                const info = CATEGORY_LABELS[key];
                const isEssential = key === "essential";
                const checked = consent?.categories?.[key] ?? isEssential;

                return (
                  <div
                    key={key}
                    className="flex items-start gap-3 p-3 rounded-sm bg-gray-50 dark:bg-gray-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={`cookie-${key}`}
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer"
                      >
                        {info.title}
                      </label>
                      <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                    </div>
                    <input
                      id={`cookie-${key}`}
                      type="checkbox"
                      checked={checked}
                      disabled={isEssential}
                      onChange={(e) => {
                        // For simplicity we use direct store updates
                        const cats = { ...(consent?.categories || {}), [key]: e.target.checked } as any;
                        useConsentStore.setState({ consent: { ...consent!, categories: cats } } as any);
                      }}
                      className="mt-1 size-4 rounded-sm border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-3 p-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                onClick={() => rejectNonEssential()}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Reject All
              </Button>
              <Button
                onClick={() => {
                  const cats = { ...(consent?.categories || { essential: true }) };
                  savePreferences(cats as any);
                }}
                size="sm"
                className="flex-1"
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
