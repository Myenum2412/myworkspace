"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { Loader2Icon, SaveIcon, GlobeIcon } from "lucide-react";

interface ChannelSettings {
  inApp: boolean;
  email: boolean;
  push: boolean;
  sms: boolean;
  webhook: boolean;
}

interface NotificationSettingsData {
  userId: string;
  orgId: string;
  categorySettings: Record<string, ChannelSettings>;
  frequency: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  doNotDisturb: boolean;
  desktopEnabled: boolean;
  soundEnabled: boolean;
  emailDigestTime: string;
  emailDigestTimezone: string;
  language: string;
  criticalNotificationsAlwaysOn: boolean;
}

const CATEGORIES = [
  { id: "auth", label: "Authentication" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "approvals", label: "Approvals" },
  { id: "permissions", label: "Permissions" },
  { id: "hr", label: "HR & Employees" },
  { id: "clients", label: "Clients" },
  { id: "messages", label: "Messages" },
  { id: "billing", label: "Billing" },
  { id: "security", label: "Security" },
  { id: "system", label: "System" },
  { id: "team", label: "Team" },
];

const FREQUENCIES = [
  { value: "instant", label: "Instant" },
  { value: "hourly", label: "Hourly Digest" },
  { value: "daily", label: "Daily Digest" },
  { value: "weekly", label: "Weekly Digest" },
];

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Kolkata", "Australia/Sydney", "Pacific/Auckland",
];

const defaultChannel = (): ChannelSettings => ({
  inApp: true, email: true, push: true, sms: false, webhook: false,
});

export default function NotificationSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/notifications/settings", { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setSettings(d.data);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch("/api/notifications/settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch {} finally {
      setSaving(false);
    }
  };

  const updateCategory = useCallback((cat: string, key: keyof ChannelSettings, value: boolean) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categorySettings: {
          ...prev.categorySettings,
          [cat]: { ...(prev.categorySettings[cat] || defaultChannel()), [key]: value, email: true },
        },
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Notification Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure how you receive notifications</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-1.5">
          {saving ? <Loader2Icon className="size-4 animate-spin" /> : <SaveIcon className="size-4" />}
          Save Changes
        </Button>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotificationsActiveIcon className="size-4" />
            Delivery Preferences
          </CardTitle>
          <CardDescription>Choose how frequently you receive notification digests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Notification Frequency</Label>
              <Select value={settings?.frequency || "instant"}
                onValueChange={(v) => setSettings((p) => p ? { ...p, frequency: v } : p)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={settings?.language || "en"}
                onValueChange={(v) => setSettings((p) => p ? { ...p, language: v } : p)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Email Digest Time</Label>
              <Input type="time" value={settings?.emailDigestTime || "08:00"}
                onChange={(e) => setSettings((p) => p ? { ...p, emailDigestTime: e.target.value } : p)} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={settings?.emailDigestTimezone || "UTC"}
                onValueChange={(v) => setSettings((p) => p ? { ...p, emailDigestTimezone: v } : p)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <NotificationsActiveIcon className="size-4" />
            Notification Behavior
          </CardTitle>
          <CardDescription>Configure how notifications behave</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Desktop Notifications</Label>
              <p className="text-xs text-muted-foreground">Show desktop notification popups</p>
            </div>
            <Switch checked={settings?.desktopEnabled ?? true}
              onCheckedChange={(v) => setSettings((p) => p ? { ...p, desktopEnabled: v } : p)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Sound</Label>
              <p className="text-xs text-muted-foreground">Play sound for new notifications</p>
            </div>
            <Switch checked={settings?.soundEnabled ?? true}
              onCheckedChange={(v) => setSettings((p) => p ? { ...p, soundEnabled: v } : p)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Critical Notifications Always On</Label>
              <p className="text-xs text-muted-foreground">Security alerts and critical notifications bypass all mute settings</p>
            </div>
            <Switch checked={settings?.criticalNotificationsAlwaysOn ?? true}
              onCheckedChange={(v) => setSettings((p) => p ? { ...p, criticalNotificationsAlwaysOn: v } : p)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeIcon className="size-4" />
            Category Preferences
          </CardTitle>
          <CardDescription>Configure notification channels for each category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4 text-xs font-medium text-muted-foreground pb-2 px-1">
              <div>Category</div>
              <div className="text-center">In-App</div>
              <div className="text-center">Push</div>
              <div className="text-center">SMS</div>
            </div>
            {CATEGORIES.map((cat) => {
              const channels = settings?.categorySettings?.[cat.id] || defaultChannel();
              return (
                <div key={cat.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-0">
                  <Label className="text-sm font-medium">{cat.label}</Label>
                  <div className="flex justify-center">
                    <Switch checked={channels.inApp}
                      onCheckedChange={(v) => updateCategory(cat.id, "inApp", v)} />
                  </div>
                  <div className="flex justify-center">
                    <Switch checked={channels.push}
                      onCheckedChange={(v) => updateCategory(cat.id, "push", v)} />
                  </div>
                  <div className="flex justify-center">
                    <Switch checked={channels.sms}
                      onCheckedChange={(v) => updateCategory(cat.id, "sms", v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
