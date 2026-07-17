"use client";

import { PreferencesCenter } from "@/components/consent/preferences-center";
import { CookieBanner } from "@/components/consent/cookie-banner";

export default function CookiePreferencesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4">
      <PreferencesCenter />
      <CookieBanner />
    </div>
  );
}
