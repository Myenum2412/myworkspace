"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RiMailLine,
  RiCalendarLine,
  RiTimeLine,
  RiSettings3Line,
  RiCheckLine,
  RiCloseLine,
  RiRefreshLine,
  RiPlayLine,
  RiPauseLine,
  RiHistoryLine,
  RiUserLine,
  RiTeamLine,
} from "@remixicon/react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2Icon } from "lucide-react"

type SchedulerSettings = {
  enabled: boolean
  paused: boolean
  sendTime: string
  timezone: string
  daysEnabled: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  recipients: "staff" | "users" | "both"
  includePendingTasks: boolean
  includeOverdueTasks: boolean
  includeHighPriorityTasks: boolean
  includeTodayTasks: boolean
}

type SchedulerStats = {
  enabled: boolean
  paused: boolean
  sendTime: string
  timezone: string
  lastSuccessfulRun: string | null
  lastFailedRun: string | null
  lastError: string | null
  emailsSentToday: number
  emailsFailedToday: number
  totalEmailsSent: number
  nextScheduledRun: string
  auditStats: {
    totalSent: number
    totalFailed: number
    sentToday: number
    failedToday: number
  }
}

type AuditLog = {
  id: string
  userEmail: string
  status: string
  subject: string
  taskCount: number
  pendingCount: number
  overdueCount: number
  highPriorityCount: number
  errorMessage?: string
  sentAt?: string
  createdAt: string
}

type UserPreferences = {
  dailyTaskEmail: boolean
  weekendEmails: boolean
  overdueReminders: boolean
  highPriorityAlerts: boolean
}

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
]

export default function EmailAutomationClient() {
  const [settings, setSettings] = useState<SchedulerSettings | null>(null)
  const [stats, setStats] = useState<SchedulerStats | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    dailyTaskEmail: true,
    weekendEmails: true,
    overdueReminders: true,
    highPriorityAlerts: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [activeTab, setActiveTab] = useState<"admin" | "preferences" | "history">("admin")

  const fetchSettings = useCallback(async () => {
    try {
      const [settingsRes, statsRes, prefsRes, logsRes] = await Promise.all([
        fetch("/api/daily-task-email-scheduler/admin/settings"),
        fetch("/api/daily-task-email-scheduler/admin/stats"),
        fetch("/api/daily-task-email-scheduler/preferences"),
        fetch("/api/daily-task-email-scheduler/admin/audit-logs?limit=20"),
      ])

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.data)
      }

      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.data)
      }

      if (prefsRes.ok) {
        const data = await prefsRes.json()
        setUserPreferences(data.data)
      }

      if (logsRes.ok) {
        const data = await logsRes.json()
        setAuditLogs(data.data.logs || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await fetch("/api/daily-task-email-scheduler/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      await fetchSettings()
    } finally {
      setSaving(false)
    }
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    try {
      await fetch("/api/daily-task-email-scheduler/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userPreferences),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRunNow = async () => {
    setRunning(true)
    try {
      await fetch("/api/daily-task-email-scheduler/admin/run", {
        method: "POST",
      })
      await fetchSettings()
    } finally {
      setRunning(false)
    }
  }

  const handleRetryFailed = async () => {
    setRetrying(true)
    try {
      await fetch("/api/daily-task-email-scheduler/admin/retry-failed", {
        method: "POST",
      })
      await fetchSettings()
    } finally {
      setRetrying(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email Automation</h1>
        <p className="text-sm text-muted-foreground">
          Configure daily task email scheduler and notification preferences.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "admin" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("admin")}
        >
          <RiSettings3Line className="size-4 mr-2" />
          Scheduler Settings
        </Button>
        <Button
          variant={activeTab === "preferences" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("preferences")}
        >
          <RiUserLine className="size-4 mr-2" />
          My Preferences
        </Button>
        <Button
          variant={activeTab === "history" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveTab("history")}
        >
          <RiHistoryLine className="size-4 mr-2" />
          Email History
        </Button>
      </div>

      {/* Admin Tab */}
      {activeTab === "admin" && settings && stats && (
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RiMailLine className="size-5" />
                Scheduler Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Badge variant={stats.enabled && !stats.paused ? "default" : "secondary"}>
                    {stats.enabled && !stats.paused ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Next Scheduled Run</Label>
                  <p className="text-sm">{formatDate(stats.nextScheduledRun)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Last Successful Run</Label>
                  <p className="text-sm">{formatDate(stats.lastSuccessfulRun)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Last Failed Run</Label>
                  <p className="text-sm">{formatDate(stats.lastFailedRun)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Statistics</CardTitle>
            </CardHeader>
            <CardFooter className="gap-2">
              <Button onClick={handleRunNow} disabled={running}>
                {running ? (
                  <Loader2Icon className="size-4 animate-spin mr-2" />
                ) : (
                  <RiPlayLine className="size-4 mr-2" />
                )}
                Run Now
              </Button>
              <Button variant="outline" onClick={handleRetryFailed} disabled={retrying}>
                {retrying ? (
                  <Loader2Icon className="size-4 animate-spin mr-2" />
                ) : (
                  <RiRefreshLine className="size-4 mr-2" />
                )}
                Retry Failed
              </Button>
            </CardFooter>
          </Card>

          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduler Configuration</CardTitle>
              <CardDescription>Configure when and how daily task emails are sent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Daily Task Emails</Label>
                  <p className="text-sm text-muted-foreground">Send daily task summary emails to users</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(v) => setSettings({ ...settings, enabled: v })}
                />
              </div>

              <Separator />

              {/* Pause */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Pause All Emails</Label>
                  <p className="text-sm text-muted-foreground">Temporarily pause all scheduled emails</p>
                </div>
                <Switch
                  checked={settings.paused}
                  onCheckedChange={(v) => setSettings({ ...settings, paused: v })}
                />
              </div>

              <Separator />

              {/* Send Time */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Send Time</Label>
                  <Input
                    type="time"
                    value={settings.sendTime}
                    onChange={(e) => setSettings({ ...settings, sendTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Days */}
              <div className="space-y-3">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(settings.daysEnabled).map(([day, enabled]) => (
                    <div key={day} className="flex items-center gap-2">
                      <Switch
                        checked={enabled}
                        onCheckedChange={(v) =>
                          setSettings({
                            ...settings,
                            daysEnabled: { ...settings.daysEnabled, [day]: v },
                          })
                        }
                      />
                      <Label className="capitalize">{day.slice(0, 3)}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Recipients */}
              <div className="space-y-2">
                <Label>Recipients</Label>
                <Select
                  value={settings.recipients}
                  onValueChange={(v: "staff" | "users" | "both") =>
                    setSettings({ ...settings, recipients: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">Both Staff & Users</SelectItem>
                    <SelectItem value="staff">Staff Members Only</SelectItem>
                    <SelectItem value="users">Workspace Users Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Content Options */}
              <div className="space-y-3">
                <Label>Email Content</Label>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.includePendingTasks}
                      onCheckedChange={(v) => setSettings({ ...settings, includePendingTasks: v })}
                    />
                    <Label>Include Pending Tasks</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.includeOverdueTasks}
                      onCheckedChange={(v) => setSettings({ ...settings, includeOverdueTasks: v })}
                    />
                    <Label>Include Overdue Tasks</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.includeHighPriorityTasks}
                      onCheckedChange={(v) => setSettings({ ...settings, includeHighPriorityTasks: v })}
                    />
                    <Label>Include High Priority Tasks</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.includeTodayTasks}
                      onCheckedChange={(v) => setSettings({ ...settings, includeTodayTasks: v })}
                    />
                    <Label>Include Today's Tasks</Label>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings} disabled={saving}>
                {saving ? (
                  <Loader2Icon className="size-4 animate-spin mr-2" />
                ) : (
                  <RiCheckLine className="size-4 mr-2" />
                )}
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <Card>
          <CardHeader>
            <CardTitle>My Email Preferences</CardTitle>
            <CardDescription>Configure your personal notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Receive Daily Task Email</Label>
                <p className="text-sm text-muted-foreground">Get daily summary of your assigned tasks</p>
              </div>
              <Switch
                checked={userPreferences.dailyTaskEmail}
                onCheckedChange={(v) => setUserPreferences({ ...userPreferences, dailyTaskEmail: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Receive Weekend Emails</Label>
                <p className="text-sm text-muted-foreground">Get emails on weekends (Saturday & Sunday)</p>
              </div>
              <Switch
                checked={userPreferences.weekendEmails}
                onCheckedChange={(v) => setUserPreferences({ ...userPreferences, weekendEmails: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Receive Overdue Task Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminded about overdue tasks</p>
              </div>
              <Switch
                checked={userPreferences.overdueReminders}
                onCheckedChange={(v) => setUserPreferences({ ...userPreferences, overdueReminders: v })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Receive High Priority Task Alerts</Label>
                <p className="text-sm text-muted-foreground">Get alerts for high priority tasks</p>
              </div>
              <Switch
                checked={userPreferences.highPriorityAlerts}
                onCheckedChange={(v) => setUserPreferences({ ...userPreferences, highPriorityAlerts: v })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : (
                <RiCheckLine className="size-4 mr-2" />
              )}
              Save Preferences
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle>Email Delivery History</CardTitle>
            <CardDescription>View recent email delivery attempts.</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No email history yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          log.status === "sent"
                            ? "default"
                            : log.status === "failed"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {log.status}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{log.userEmail}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.taskCount} tasks • {log.overdueCount} overdue • {log.highPriorityCount} high priority
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                      {log.errorMessage && (
                        <p className="text-xs text-red-500">{log.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
