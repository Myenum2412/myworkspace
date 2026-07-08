"use client";

import { useState, useEffect, useCallback } from "react";

interface NotificationTypeSetting {
  type: string;
  enabled: boolean;
  push: boolean;
  email: boolean;
  inApp: boolean;
}

interface NotificationSettingsData {
  userId: string;
  settings: NotificationTypeSetting[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  desktopEnabled: boolean;
  soundEnabled: boolean;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/settings", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.data);
      }
    } catch {}
    setLoading(false);
  };

  const updateSettings = useCallback(async (updates: Partial<NotificationSettingsData>) => {
    try {
      const res = await fetch("/api/notifications/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.data);
      }
    } catch {}
  }, []);

  return { settings, loading, updateSettings, refetch: fetchSettings };
}
