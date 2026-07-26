import {
  RiBracesLine,
  RiChat3Line,
  RiFingerprintLine,
  RiFlashlightLine,
  RiGitBranchLine,
  RiGroupLine,
  RiHistoryLine,
  RiKeyLine,
  RiRobot2Line,
  RiShieldCheckLine,
  RiTimerFlashLine,
} from "@remixicon/react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type Feature = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

type FeatureTab = {
  value: string
  label: string
  features: Feature[]
}

const TABS: FeatureTab[] = [
  {
    value: "collaboration",
    label: "Collaboration",
    features: [
      {
        icon: RiGroupLine,
        title: "Shared workspaces",
        description:
          "Bring every team into one workspace with granular roles and instant invites.",
      },
      {
        icon: RiChat3Line,
        title: "Inline comments",
        description:
          "Discuss changes in context with threaded comments, mentions, and reactions.",
      },
      {
        icon: RiHistoryLine,
        title: "Version history",
        description:
          "Track every edit and restore any previous state with a single click.",
      },
    ],
  },
  {
    value: "automation",
    label: "Automation",
    features: [
      {
        icon: RiFlashlightLine,
        title: "Visual workflows",
        description:
          "Chain triggers and actions on a drag-and-drop canvas, no code required.",
      },
      {
        icon: RiRobot2Line,
        title: "Smart agents",
        description:
          "Let Acme agents triage requests, draft replies, and route work for you.",
      },
      {
        icon: RiTimerFlashLine,
        title: "Scheduled runs",
        description:
          "Queue recurring jobs down to the minute with built-in retries and alerts.",
      },
    ],
  },
  {
    value: "security",
    label: "Security",
    features: [
      {
        icon: RiShieldCheckLine,
        title: "SOC 2 Type II",
        description:
          "Independently audited controls keep your data compliant and protected.",
      },
      {
        icon: RiKeyLine,
        title: "SSO & SCIM",
        description:
          "Provision users through SAML, OIDC, and automated directory sync.",
      },
      {
        icon: RiFingerprintLine,
        title: "Audit logging",
        description:
          "Every action is timestamped, immutable, and exportable to your SIEM.",
      },
    ],
  },
]

export default function FeaturesBlock() {
  return (
    <section className="flex w-full items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col items-center text-center">
          <Badge variant="secondary" className="gap-1.5">
            <RiBracesLine data-icon="inline-start" className="size-3.5" />
            Built for teams
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Everything you need to ship faster
          </h2>
          <p className="mt-3 max-w-xl text-pretty text-muted-foreground">
            Acme brings collaboration, automation, and enterprise-grade security
            together in one connected platform.
          </p>
        </div>

        <Tabs
          defaultValue="collaboration"
          className="mt-10 w-full items-center"
        >
          <TabsList className="h-auto flex-wrap gap-1 rounded-none p-1">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none px-4 py-1.5 text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {TABS.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-8">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {tab.features.map((feature) => {
                  const Icon = feature.icon
                  return (
                    <Card
                      key={feature.title}
                      className="group h-full gap-4 p-6 transition-colors hover:border-primary/40"
                    >
                      <div
                        className={cn(
                          "flex size-11 items-center justify-center rounded-none",
                          "bg-primary/10 text-primary transition-colors",
                          "group-hover:bg-primary group-hover:text-primary-foreground"
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="text-base font-medium">
                          {feature.title}
                        </h3>
                        <p className="text-sm/relaxed text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                      <div className="mt-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <RiGitBranchLine className="size-3.5" />
                        Included on every plan
                      </div>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}
