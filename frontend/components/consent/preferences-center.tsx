"use client";

import { useState } from "react";
import { Shield, Cookie, Check, RotateCcw, Trash2 } from "lucide-react";
import { useConsentStore, ConsentCategories } from "@/lib/consent/store";
import { getConsentHistory } from "@/lib/consent/services";
import { Button } from "@/components/ui/button";

const CATEGORIES: { key: keyof ConsentCategories; title: string; description: string }[] = [
  { key: "essential", title: "Essential", description: "Required for the website to function. Includes authentication, security, and session management." },
  { key: "functional", title: "Functional", description: "Enables enhanced functionality like live chat, support widgets, and personalization." },
  { key: "analytics", title: "Analytics", description: "Helps us understand how visitors interact with the platform through anonymous usage data." },
  { key: "performance", title: "Performance", description: "Tracks performance metrics to improve speed, reliability, and user experience." },
  { key: "personalization", title: "Personalization", description: "Remembers your preferences, language, and region for a tailored experience." },
  { key: "marketing", title: "Marketing", description: "Used for marketing campaigns, retargeting, and advertising personalization." },
];

export function PreferencesCenter() {
  const { consent, savePreferences, withdrawConsent, setShowPreferences } = useConsentStore();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [localCats, setLocalCats] = useState<ConsentCategories | null>(null);

  const categories = localCats || consent?.categories || {
    essential: true,
    functional: false,
    analytics: false,
    performance: false,
    personalization: false,
    marketing: false,
  } as ConsentCategories;

  const handleToggle = (key: keyof ConsentCategories) => {
    if (key === "essential") return;
    setLocalCats({ ...categories, [key]: !categories[key] });
  };

  const handleSave = async () => {
    setLoading(true);
    await savePreferences(categories);
    setLocalCats(null);
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!confirm("Are you sure you want to withdraw all consent? This will disable all non-essential cookies.")) return;
    setLoading(true);
    await withdrawConsent();
    setLocalCats(null);
    setLoading(false);
  };

  const loadHistory = async () => {
    setShowHistory(!showHistory);
    if (!showHistory) {
      const data = await getConsentHistory();
      setHistory(data.data || []);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-sm bg-primary/10 flex items-center justify-center">
          <Shield className="size-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cookie Preferences</h1>
          <p className="text-sm text-gray-500">Manage how we use cookies and tracking technologies</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
        {CATEGORIES.map(({ key, title, description }) => (
          <div key={key} className="flex items-start gap-4 p-4">
            <div className="flex-1 min-w-0">
              <label htmlFor={`pref-${key}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer">
                {title}
                {key === "essential" && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">(Always active)</span>
                )}
              </label>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input
                id={`pref-${key}`}
                type="checkbox"
                checked={categories[key] ?? key === "essential"}
                disabled={key === "essential"}
                onChange={() => handleToggle(key)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-sm peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-sm after:h-4 after:w-4 after:transition-all peer-checked:bg-primary" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} disabled={loading || updating}>
          <Check className="size-4 mr-1.5" />
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
        <Button onClick={handleWithdraw} variant="outline" disabled={loading}>
          <Trash2 className="size-4 mr-1.5" />
          Withdraw Consent
        </Button>
        <Button onClick={loadHistory} variant="ghost" size="sm">
          <RotateCcw className="size-3.5 mr-1.5" />
          {showHistory ? "Hide History" : "View History"}
        </Button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Consent History</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-60 overflow-y-auto">
            {history.map((h: any) => (
              <div key={h.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Version {h.consentVersion}</span>
                  <span className="text-xs text-gray-400">{formatDate(h.consentTimestamp)}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(h.categories || {}).filter(([, v]) => v).map(([k]) => (
                    <span key={k} className="px-1.5 py-0.5 bg-primary/5 text-primary text-[10px] rounded-sm">{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-400 space-y-1">
        <p>Your privacy matters to us. You can change your preferences at any time.</p>
        <p>Essential cookies are always enabled as they are required for platform functionality.</p>
      </div>
    </div>
  );
}
