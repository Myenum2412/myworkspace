"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotificationSettings } from "@/hooks/use-notification-settings";
import { Loader2Icon, BellIcon, BellOffIcon, Volume2Icon, MoonIcon } from "lucide-react";
import { useNotificationPermission } from "@/hooks/use-notification-permission";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push-subscription";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_updated: "Task Updated",
  mention: "Mentions",
  invite: "Invitations",
  system: "System",
  comment: "Comments",
  status_change: "Status Changes",
  message: "Messages",
  project_update: "Project Updates",
  billing_reminder: "Billing Reminders",
  approval_request: "Approval Requests",
  team_update: "Team Updates",
  announcement: "Announcements",
};

export default function NotificationSettingsPage() {
  const { settings, loading, updateSettings } = useNotificationSettings();
  const { permission, requestPermission } = useNotificationPermission();
  const [saving, setSaving] = useState(false);

  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled && permission !== "granted") {
      const result = await requestPermission();
      if (result === "granted") {
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => subscribeToPush(reg)).catch(() => {});
        }
      } else {
        return;
      }
    }
    await updateSettings({ desktopEnabled: enabled });
  };

  const handleTypeSetting = async (
    type: string,
    field: "enabled" | "push" | "email" | "inApp",
    value: boolean
  ) => {
    if (!settings) return;
    const newSettings = settings.settings.map((s) =>
      s.type === type ? { ...s, [field]: value } : s
    );
    if (!newSettings.find((s) => s.type === type)) {
      newSettings.push({
        type,
        enabled: true,
        push: true,
        email: false,
        inApp: true,
      });
    }
    await updateSettings({ settings: newSettings });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Notification Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage how and when you receive notifications
        </p>
      </div>

      <Separator />

      {/* Desktop / PWA Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {permission === "granted" ? (
              <BellIcon className="size-4 text-primary" />
            ) : (
              <BellOffIcon className="size-4 text-muted-foreground" />
            )}
            Desktop Notifications
          </CardTitle>
          <CardDescription>
            Receive browser notifications when the app is in the background.
            {permission === "denied" && (
              <span className="block mt-1 text-amber-600">
                Notifications are blocked in your browser settings. Update your site permissions to enable.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="desktop-notifications" className="text-sm">
              Enable desktop notifications
            </Label>
            <Switch
              id="desktop-notifications"
              checked={settings?.desktopEnabled ?? false}
              onCheckedChange={handleDesktopToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sound */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2Icon className="size-4" />
            Sound
          </CardTitle>
          <CardDescription>Play a sound when a new notification arrives.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="notification-sound" className="text-sm">
              Notification sound
            </Label>
            <Switch
              id="notification-sound"
              checked={settings?.soundEnabled ?? false}
              onCheckedChange={(v) => updateSettings({ soundEnabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MoonIcon className="size-4" />
            Quiet Hours
          </CardTitle>
          <CardDescription>Mute notifications during specific hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours" className="text-sm">
              Enable quiet hours
            </Label>
            <Switch
              id="quiet-hours"
              checked={settings?.quietHoursEnabled ?? false}
              onCheckedChange={(v) => updateSettings({ quietHoursEnabled: v })}
            />
          </div>
          {settings?.quietHoursEnabled && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="quiet-start" className="text-xs">From</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  className="w-32 h-8 text-sm"
                  value={settings?.quietHoursStart || "22:00"}
                  onChange={(e) => updateSettings({ quietHoursStart: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="quiet-end" className="text-xs">To</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  className="w-32 h-8 text-sm"
                  value={settings?.quietHoursEnd || "08:00"}
                  onChange={(e) => updateSettings({ quietHoursEnd: e.target.value })}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification Types</CardTitle>
          <CardDescription>Choose which types of notifications you want to receive.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="grid grid-cols-4 gap-4 pb-2 text-xs font-medium text-muted-foreground">
              <div>Type</div>
              <div className="text-center">In-App</div>
              <div className="text-center">Push</div>
              <div className="text-center">Email</div>
            </div>
            <Separator />
            {Object.entries(NOTIFICATION_TYPE_LABELS).map(([type, label]) => {
              const setting = settings?.settings?.find((s) => s.type === type);
              const enabled = setting?.enabled ?? true;
              const inApp = setting?.inApp ?? true;
              const push = setting?.push ?? true;
              const email = setting?.email ?? false;

              return (
                <div key={type} className="grid grid-cols-4 gap-4 py-2.5 items-center">
                  <Label className="text-sm font-normal cursor-pointer">{label}</Label>
                  <div className="flex justify-center">
                    <Switch
                      checked={inApp}
                      onCheckedChange={(v) => handleTypeSetting(type, "inApp", v)}
                      disabled={!enabled}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={push}
                      onCheckedChange={(v) => handleTypeSetting(type, "push", v)}
                      disabled={!enabled}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={email}
                      onCheckedChange={(v) => handleTypeSetting(type, "email", v)}
                      disabled={!enabled}
                    />
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
