"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RiGoogleLine,
  RiMicrosoftLine,
  RiCheckLine,
  RiRefreshLine,
  RiCalendarLine,
  RiSettings3Line,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiInformationLine,
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
import { Loader2Icon } from "lucide-react"

type CalendarConnection = {
  id: string
  provider: "google" | "microsoft"
  calendarEmail: string
  calendarName: string
  syncEnabled: boolean
  lastSyncAt: string | null
  createdAt: string
}

type CalendarInfo = {
  id: string
  summary: string
  description?: string
  timeZone?: string
  backgroundColor?: string
  accessRole?: string
  primary?: boolean
  selected?: boolean
}

export default function CalendarIntegrationClient() {
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [calendars, setCalendars] = useState<CalendarInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)
  const [showCalendars, setShowCalendars] = useState(false)

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/connections")
      if (res.ok) {
        const data = await res.json()
        setConnections(data.data || [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCalendars = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/calendars")
      if (res.ok) {
        const data = await res.json()
        setCalendars(data.data || [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  useEffect(() => {
    if (connections.length > 0) {
      fetchCalendars()
    }
  }, [connections.length, fetchCalendars])

  const handleConnect = async (provider: "google" | "microsoft") => {
    setConnecting(provider)
    window.location.href = `/api/calendar/${provider}`
  }

  const handleDisconnect = async (provider: string) => {
    setConnecting(provider)
    try {
      await fetch(`/api/calendar/connections?provider=${provider}`, {
        method: "DELETE",
      })
      await fetchConnections()
      setCalendars([])
    } finally {
      setConnecting(null)
    }
  }

  const handleSync = async (connectionId: string) => {
    setSyncing(connectionId)
    try {
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      })
      await fetchConnections()
    } finally {
      setSyncing(null)
    }
  }

  const formatLastSync = (date: string | null): string => {
    if (!date) return "Never"
    const d = new Date(date)
    return d.toLocaleString()
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiCalendarLine className="size-5" />
            Calendar Connections
          </CardTitle>
          <CardDescription>
            Manage your connected calendar accounts and sync settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <RiCalendarLine className="size-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No calendar connections found.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect your Google Calendar or Outlook to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <span className="flex size-10 items-center justify-center border border-border bg-muted">
                      {conn.provider === "google" ? (
                        <RiGoogleLine className="size-5" />
                      ) : (
                        <RiMicrosoftLine className="size-5" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium">{conn.calendarEmail}</p>
                      <p className="text-xs text-muted-foreground">
                        {conn.provider === "google" ? "Google Calendar" : "Microsoft Outlook"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last synced: {formatLastSync(conn.lastSyncAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={conn.syncEnabled ? "default" : "secondary"}>
                      {conn.syncEnabled ? "Active" : "Paused"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSync(conn.id)}
                      disabled={syncing === conn.id}
                      title="Sync now"
                    >
                      {syncing === conn.id ? (
                        <Loader2Icon className="size-4 animate-spin" />
                      ) : (
                        <RiRefreshLine className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDisconnect(conn.provider)}
                      disabled={connecting === conn.provider}
                      title="Disconnect"
                    >
                      <RiDeleteBinLine className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Available Integrations</CardTitle>
          <CardDescription>
            Connect your calendar accounts to sync events and meetings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google Calendar */}
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center border border-border bg-muted">
                <RiGoogleLine className="size-5" />
              </span>
              <div>
                <p className="font-medium">Google Calendar</p>
                <p className="text-xs text-muted-foreground">
                  Sync events, create meetings, and manage your schedule.
                </p>
              </div>
            </div>
            <Button
              variant={connections.some((c) => c.provider === "google") ? "outline" : "default"}
              size="sm"
              onClick={() => handleConnect("google")}
              disabled={connecting === "google"}
            >
              {connecting === "google" ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : connections.some((c) => c.provider === "google") ? (
                <RiCheckLine className="size-4 mr-2" />
              ) : null}
              {connections.some((c) => c.provider === "google") ? "Connected" : "Connect"}
            </Button>
          </div>

          {/* Microsoft Outlook */}
          <div className="flex items-center justify-between gap-4 p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <span className="flex size-10 items-center justify-center border border-border bg-muted">
                <RiMicrosoftLine className="size-5" />
              </span>
              <div>
                <p className="font-medium">Microsoft Outlook</p>
                <p className="text-xs text-muted-foreground">
                  Connect your Outlook calendar for two-way sync.
                </p>
              </div>
            </div>
            <Button
              variant={connections.some((c) => c.provider === "microsoft") ? "outline" : "default"}
              size="sm"
              onClick={() => handleConnect("microsoft")}
              disabled={connecting === "microsoft"}
            >
              {connecting === "microsoft" ? (
                <Loader2Icon className="size-4 animate-spin mr-2" />
              ) : connections.some((c) => c.provider === "microsoft") ? (
                <RiCheckLine className="size-4 mr-2" />
              ) : null}
              {connections.some((c) => c.provider === "microsoft") ? "Connected" : "Connect"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar List */}
      {calendars.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Discovered Calendars</CardTitle>
                <CardDescription>
                  Calendars found in your connected accounts.
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCalendars(!showCalendars)}
              >
                {showCalendars ? "Hide" : "Show"} ({calendars.length})
              </Button>
            </div>
          </CardHeader>
          {showCalendars && (
            <CardContent className="space-y-2">
              {calendars.map((cal) => (
                <div
                  key={cal.id}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="size-4 rounded-full"
                      style={{ backgroundColor: cal.backgroundColor || "#4285f4" }}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {cal.summary}
                        {cal.primary && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            Primary
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cal.accessRole} • {cal.timeZone || "UTC"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {cal.selected ? "Selected" : "Not selected"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiInformationLine className="size-5" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center border border-border bg-muted text-xs font-medium">
              1
            </span>
            <p>
              <strong>Connect:</strong> Click "Connect" to authorize the platform to access your
              calendar. You'll be redirected to Google/Microsoft to grant permissions.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center border border-border bg-muted text-xs font-medium">
              2
            </span>
            <p>
              <strong>Sync:</strong> Events from your calendar will automatically sync to the
              platform. You can also trigger manual sync using the refresh button.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center border border-border bg-muted text-xs font-medium">
              3
            </span>
            <p>
              <strong>Create:</strong> Create events directly from tasks or the calendar page.
              Events will sync back to your connected calendar.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center border border-border bg-muted text-xs font-medium">
              4
            </span>
            <p>
              <strong>Invite:</strong> Add attendees to calendar events. They'll receive email
              invitations automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
