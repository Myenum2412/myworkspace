"use client"

import { useState } from "react"
import {
  RiCheckLine,
  RiMicLine,
  RiHardDrive3Line,
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
  icon: typeof RiMicLine
  category: string
}

const integrations: Integration[] = [
  {
    id: "ai-voice",
    name: "AI Voice",
    description: "Voice-powered task management and dictation.",
    icon: RiMicLine,
    category: "AI",
  },
  {
    id: "ai-construction",
    name: "AI Construction",
    description: "AI-assisted construction planning and estimation.",
    icon: RiHardDrive3Line,
    category: "AI",
  },
]

export default function IntegrationsBlock() {
  const [connected, setConnected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  const handleConnect = async (integration: Integration) => {
    setLoading((prev) => ({ ...prev, [integration.id]: true }))
    setTimeout(() => {
      setConnected((prev) => ({ ...prev, [integration.id]: true }))
      setLoading((prev) => ({ ...prev, [integration.id]: false }))
    }, 1000)
  }

  const handleDisconnect = async (integration: Integration) => {
    setLoading((prev) => ({ ...prev, [integration.id]: true }))
    setTimeout(() => {
      setConnected((prev) => ({ ...prev, [integration.id]: false }))
      setLoading((prev) => ({ ...prev, [integration.id]: false }))
    }, 500)
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <Switch
                    checked={isOn}
                    onCheckedChange={() =>
                      isOn ? handleDisconnect(integration) : handleConnect(integration)
                    }
                    aria-label={`Toggle ${integration.name}`}
                  />
                </CardHeader>

                <CardContent className="flex-1 py-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
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
