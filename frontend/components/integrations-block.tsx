"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RiCheckLine,
  RiGoogleLine,
  RiMailLine,
  RiCalendarLine,
  RiStackLine,
  RiRefreshLine,
  RiExternalLinkLine,
  RiMicLine,
  RiRobot2Line,
  RiBrainLine,
  RiMagicLine,
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
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Loader2Icon } from "lucide-react"

type CalendarConnection = {
  id: string
  provider: "google"
  calendarEmail: string
  calendarName: string
  syncEnabled: boolean
  lastSyncAt: string | null
  createdAt: string
}

type Integration = {
  id: string
  name: string
  description: string
  icon: typeof RiGoogleLine
  category: string
  type: "calendar" | "email" | "ai"
  provider?: "google"
}

const integrations: Integration[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your Google Calendar events, create meetings, and manage schedules directly from the platform.",
    icon: RiGoogleLine,
    category: "Calendar",
    type: "calendar",
    provider: "google",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and receive emails directly from the platform using your Gmail account.",
    icon: RiMailLine,
    category: "Email",
    type: "email",
    provider: "google",
  },
  {
    id: "ai-voice",
    name: "AI Voice",
    description: "Voice-powered task management and dictation using advanced speech recognition.",
    icon: RiMicLine,
    category: "AI",
    type: "ai",
  },
  {
    id: "ai-assistant",
    name: "AI Assistant",
    description: "Intelligent assistant for task automation, scheduling, and smart recommendations.",
    icon: RiRobot2Line,
    category: "AI",
    type: "ai",
  },
  {
    id: "ai-analytics",
    name: "AI Analytics",
    description: "Advanced analytics and insights powered by machine learning algorithms.",
    icon: RiBrainLine,
    category: "AI",
    type: "ai",
  },
  {
    id: "ai-content",
    name: "AI Content",
    description: "Generate and optimize content using AI-powered writing tools.",
    icon: RiMagicLine,
    category: "AI",
    type: "ai",
  },
]

export default function IntegrationsBlock() {
  const [connections, setConnections] = useState<CalendarConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

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

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const isConnected = (integration: Integration): boolean => {
    if (integration.type === "calendar" && integration.provider) {
      return connections.some(
        (c) => c.provider === integration.provider && c.syncEnabled
      )
    }
    return false
  }

  const getConnection = (integration: Integration): CalendarConnection | undefined => {
    if (integration.type === "calendar" && integration.provider) {
      return connections.find(
        (c) => c.provider === integration.provider && c.syncEnabled
      )
    }
    return undefined
  }

  const handleConnect = async (integration: Integration) => {
    setConnecting(integration.id)
    try {
      if (integration.type === "calendar" && integration.provider === "google") {
        window.location.href = "/api/calendar/google"
      } else {
        // For AI and other integrations, show coming soon
        alert(`${integration.name} integration coming soon!`)
      }
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    setConnecting(integration.id)
    try {
      if (integration.type === "calendar" && integration.provider) {
        await fetch(`/api/calendar/connections?provider=${integration.provider}`, {
          method: "DELETE",
        })
        await fetchConnections()
      }
    } finally {
      setConnecting(null)
    }
  }

  const handleSync = async (integration: Integration) => {
    const connection = getConnection(integration)
    if (!connection) return

    setSyncing(integration.id)
    try {
      await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: connection.id }),
      })
      await fetchConnections()
    } finally {
      setSyncing(null)
    }
  }

  const formatLastSync = (date: string | null): string => {
    if (!date) return "Never"
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <section className="flex w-full justify-center text-foreground">
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <Badge variant="secondary">
            <RiStackLine data-icon="inline-start" className="size-3.5" />
            Integrations
          </Badge>
          <p className="text-sm text-muted-foreground">
            Connect your calendars and email to sync events and manage communications.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {integrations.map((integration) => {
              const isOn = isConnected(integration)
              const connection = getConnection(integration)
              const isConnecting = connecting === integration.id
              const isSyncing = syncing === integration.id
              const Icon = integration.icon

              return (
                <Card
                  key={integration.id}
                  className={cn(
                    "flex flex-col gap-0 transition-colors",
                    isOn && "border-primary/40 bg-primary/[0.03]"
                  )}
                >
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-none border border-border bg-muted text-foreground transition-colors",
                          isOn && "border-primary/30 bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="space-y-0.5">
                        <CardTitle className="text-base leading-none">
                          {integration.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {integration.category}
                        </CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={isOn}
                      onCheckedChange={() =>
                        isOn ? handleDisconnect(integration) : handleConnect(integration)
                      }
                      disabled={isConnecting}
                      aria-label={`Toggle ${integration.name}`}
                    />
                  </CardHeader>

                  <CardContent className="flex-1 py-4">
                    <p className="text-sm text-muted-foreground">
                      {integration.description}
                    </p>

                    {isOn && connection && (
                      <div className="mt-4 space-y-2">
                        <Separator />
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Connected as:</span>
                          <span className="font-medium">{connection.calendarEmail}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Last synced:</span>
                          <span className="font-medium">
                            {formatLastSync(connection.lastSyncAt)}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="items-center justify-between">
                    {isOn ? (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        <RiCheckLine
                          data-icon="inline-start"
                          className="size-3.5"
                        />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not connected</Badge>
                    )}

                    <div className="flex items-center gap-2">
                      {isOn && integration.type === "calendar" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(integration)}
                          disabled={isSyncing}
                          title="Sync now"
                        >
                          {isSyncing ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <RiRefreshLine className="size-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant={isOn ? "ghost" : "default"}
                        size="sm"
                        onClick={() =>
                          isOn ? handleDisconnect(integration) : handleConnect(integration)
                        }
                        disabled={isConnecting}
                        className={cn(isOn && "text-muted-foreground")}
                      >
                        {isConnecting ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : isOn ? (
                          "Disconnect"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 space-y-4">
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/calendar" className="gap-2">
                <RiCalendarLine className="size-4" />
                Open Calendar
                <RiExternalLinkLine className="size-3" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
