"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ConsentCategories {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  performance: boolean;
  personalization: boolean;
  marketing: boolean;
}

export interface ConsentPreference {
  categories: ConsentCategories;
  version: number;
  timestamp: string;
  source?: string;
}

export interface RegionInfo {
  region: string;
  gdprApplies: boolean;
  ccpaApplies: boolean;
  lgpdApplies: boolean;
  pipedaApplies: boolean;
  cookieExpiryDays: number;
  requiresExplicitConsent: boolean;
}

interface ConsentState {
  consent: ConsentPreference | null;
  region: RegionInfo | null;
  showBanner: boolean;
  showPreferences: boolean;
  loading: boolean;
  initialized: boolean;
  setConsent: (pref: ConsentPreference) => void;
  setRegion: (info: RegionInfo) => void;
  setShowBanner: (show: boolean) => void;
  setShowPreferences: (show: boolean) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (v: boolean) => void;
  hasConsentFor: (category: keyof ConsentCategories) => boolean;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  savePreferences: (categories: ConsentCategories) => Promise<void>;
  withdrawConsent: () => Promise<void>;
  init: () => Promise<void>;
}

const DEFAULT_CATEGORIES: ConsentCategories = {
  essential: true,
  functional: false,
  analytics: false,
  performance: false,
  personalization: false,
  marketing: false,
};

export const useConsentStore = create<ConsentState>()(
  persist(
    (set, get) => ({
      consent: null,
      region: null,
      showBanner: true,
      showPreferences: false,
      loading: false,
      initialized: false,

      setConsent: (pref) => set({ consent: pref, showBanner: false }),
      setRegion: (info) => set({ region: info }),
      setShowBanner: (show) => set({ showBanner: show }),
      setShowPreferences: (show) => set({ showPreferences: show }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (v) => set({ initialized: v }),

      hasConsentFor: (category) => {
        const { consent } = get();
        return consent?.categories?.[category] ?? false;
      },

      acceptAll: async () => {
        const categories: ConsentCategories = {
          essential: true,
          functional: true,
          analytics: true,
          performance: true,
          personalization: true,
          marketing: true,
        };
        await get().savePreferences(categories);
      },

      rejectNonEssential: async () => {
        await get().savePreferences(DEFAULT_CATEGORIES);
      },

      savePreferences: async (categories) => {
        set({ loading: true });
        try {
          const res = await fetch("/api/consent/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              categories,
              source: "banner",
              policyVersion: 1,
            }),
          });
          const data = await res.json();
          if (data.success) {
            set({
              consent: {
                categories: data.data.categories,
                version: data.data.consentVersion,
                timestamp: data.data.consentTimestamp,
                source: "banner",
              },
              showBanner: false,
              showPreferences: false,
            });
          }
          window.dispatchEvent(new CustomEvent("consentUpdated", { detail: { categories } }));
        } catch (err) {
          console.error("Failed to save consent:", err);
        } finally {
          set({ loading: false });
        }
      },

      withdrawConsent: async () => {
        set({ loading: true });
        try {
          await fetch("/api/consent/withdraw", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          set({
            consent: null,
            showBanner: true,
            showPreferences: false,
          });
          window.dispatchEvent(new CustomEvent("consentUpdated", { detail: { categories: DEFAULT_CATEGORIES } }));
        } catch (err) {
          console.error("Failed to withdraw consent:", err);
        } finally {
          set({ loading: false });
        }
      },

      init: async () => {
        if (get().initialized) return;
        set({ loading: true });
        try {
          const [consentRes, regionRes] = await Promise.all([
            fetch("/api/consent/current", { credentials: "include" }),
            fetch("/api/consent/region", { credentials: "include" }),
          ]);

          const consentData = await consentRes.json();
          const regionData = await regionRes.json();

          if (consentData.success && consentData.data.preference) {
            const p = consentData.data.preference;
            set({
              consent: {
                categories: p.categories,
                version: p.consentVersion,
                timestamp: p.consentTimestamp,
              },
              showBanner: false,
            });
          } else {
            set({ showBanner: true });
          }

          if (regionData.success) {
            set({ region: regionData.data });
          }

          set({ initialized: true });
        } catch (err) {
          console.error("Failed to initialize consent:", err);
          set({ initialized: true, showBanner: true });
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: "consent-store",
      partialize: (state) => ({
        consent: state.consent,
        region: state.region,
      }),
    }
  )
);
