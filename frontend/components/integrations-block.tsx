"use client"

import { useState, useEffect } from "react"
import {
  RiCheckLine,
  RiMailLine,
  RiWhatsappLine,
  RiTelegramLine,
  RiFacebookLine,
  RiInstagramLine,
  RiStackLine,
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
import { Loader2Icon } from "lucide-react"

type Integration = {
  id: string
  name: string
  description: string
  icon: typeof RiWhatsappLine
  category: string
  defaultConnected?: boolean
  oauthUrl?: string
}

const integrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Send and receive emails through your Gmail account.",
    icon: RiMailLine,
    category: "Email",
    oauthUrl: "/api/email/gmail",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Send messages and notifications via WhatsApp.",
    icon: RiWhatsappLine,
    category: "Messaging",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Send alerts and updates to Telegram channels.",
    icon: RiTelegramLine,
    category: "Messaging",
  },
  {
    id: "facebook",
    name: "Facebook",
    description: "Connect your Facebook page for notifications.",
    icon: RiFacebookLine,
    category: "Social",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Manage Instagram messages and notifications.",
    icon: RiInstagramLine,
    category: "Social",
  },
]

export default function IntegrationsBlock() {
  const [connected, setConnected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [gmailEmail, setGmailEmail] = useState("")

  useEffect(() => {
    fetch("/api/email/connections")
      .then((r) => r.json())
      .then((data) => {
        if (data.data?.length) {
          setConnected((prev) => ({ ...prev, gmail: true }))
          setGmailEmail(data.data[0].email || "")
        }
      })
      .catch(() => {})
  }, [])

  const handleConnect = async (integration: Integration) => {
    if (integration.id === "gmail") {
      setLoading((prev) => ({ ...prev, gmail: true }))
      window.location.href = integration.oauthUrl!
      return
    }
    setConnected((prev) => ({ ...prev, [integration.id]: true }))
  }

  const handleDisconnect = async (integration: Integration) => {
    if (integration.id === "gmail") {
      setLoading((prev) => ({ ...prev, gmail: true }))
      try {
        await fetch("/api/email/connections", { method: "DELETE" })
        setConnected((prev) => ({ ...prev, gmail: false }))
        setGmailEmail("")
      } catch {
        // silent
      } finally {
        setLoading((prev) => ({ ...prev, gmail: false }))
      }
      return
    }
    setConnected((prev) => ({ ...prev, [integration.id]: false }))
  }

  return (
    <section className="flex w-full justify-center text-foreground">
      <div className="w-full">
        <div className="mb-8 space-y-2">
          <Badge variant="secondary">
            <RiStackLine data-icon="inline-start" className="size-3.5" />
            Connections
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {integrations.map((integration) => {
            const isOn = Boolean(connected[integration.id])
            const isLoading = Boolean(loading[integration.id])
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
                  {integration.id !== "gmail" && (
                    <Switch
                      checked={isOn}
                      onCheckedChange={() =>
                        isOn ? handleDisconnect(integration) : handleConnect(integration)
                      }
                      aria-label={`Toggle ${integration.name}`}
                    />
                  )}
                </CardHeader>

                <CardContent className="flex-1 py-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  {isOn && gmailEmail && integration.id === "gmail" && (
                    <p className="mt-1 text-xs text-primary font-medium truncate">
                      {gmailEmail}
                    </p>
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
                  <Button
                    variant={isOn ? "ghost" : "default"}
                    size="sm"
                    onClick={() =>
                      isOn ? handleDisconnect(integration) : handleConnect(integration)
                    }
                    disabled={isLoading}
                    className={cn(isOn && "text-muted-foreground")}
                  >
                    {isLoading ? (
                      <Loader2Icon className="size-4 animate-spin" />
                    ) : isOn ? (
                      "Disconnect"
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
