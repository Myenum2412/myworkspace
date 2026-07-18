"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  RiBankCardLine,
  RiCheckLine,
  RiMailLine,
  RiUserLine,
  RiSettings2Line,
  RiTeamLine,
  RiNotification3Line,
  RiLayout2Line,
  RiLink,
} from "@remixicon/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { getDropdownOptions, saveDropdownOptions, DEFAULT_DROPDOWN_OPTIONS } from "@/lib/dropdown-options"
import { SIDEBAR_FEATURES } from "@/lib/sidebar-features"
import IntegrationsBlock from "@/components/integrations-block"
import {
  Loader2Icon,
  CheckCircle2Icon,
  PlusIcon,
  Trash2Icon,
  MinusIcon,
} from "lucide-react"

const SECTION_LIMITS_KEY = "myworkspace_section_limits"

const DEFAULT_SECTION_LIMITS: Record<string, number> = {
  projects: 20,
  departments: 20,
  locations: 15,
  designations: 20,
  employmentTypes: 10,
  statuses: 10,
  branches: 15,
  shifts: 10,
  sourceOfHires: 15,
  countries: 20,
}

function getSectionLimits(): Record<string, number> {
  if (typeof window === "undefined") return DEFAULT_SECTION_LIMITS
  try {
    const stored = localStorage.getItem(SECTION_LIMITS_KEY)
    if (stored) return { ...DEFAULT_SECTION_LIMITS, ...JSON.parse(stored) }
  } catch {}
  return DEFAULT_SECTION_LIMITS
}

function saveSectionLimits(limits: Record<string, number>) {
  if (typeof window === "undefined") return
  localStorage.setItem(SECTION_LIMITS_KEY, JSON.stringify(limits))
}

export type SettingsPageClientProps = {
  orgId: string
  user: { name: string; email: string; avatar: string }
  initialSettings: {
    general?: { orgName?: string; orgSlug?: string; timezone?: string; language?: string; monthlyProjectLimit?: number }
    team?: { defaultTeamRole?: string; allowSelfAssign?: boolean; maxTeamSize?: number; autoAssignLead?: boolean; showTeamAsAssignee?: boolean }
    notifications?: {
      taskAssigned?: boolean
      taskStatusChange?: boolean
      taskComments?: boolean
      dueDateReminders?: boolean
      memberJoinLeave?: boolean
      teamMentions?: boolean
      projectUpdates?: boolean
      securityAlerts?: boolean
      billingUpdates?: boolean
      featureAnnouncements?: boolean
    }
  } | null
}

const defaultNotifSettings = {
  taskAssigned: true,
  taskStatusChange: true,
  taskComments: false,
  dueDateReminders: true,
  memberJoinLeave: true,
  teamMentions: true,
  projectUpdates: false,
  securityAlerts: true,
  billingUpdates: true,
  featureAnnouncements: false,
}

export function SettingsPageClient({ orgId, user: initialUser, initialSettings }: SettingsPageClientProps) {
  const [fullName, setFullName] = useState(initialUser.name)
  const [email, setEmail] = useState(initialUser.email)
  const [marketingEmails, setMarketingEmails] = useState(true)

  const [formData, setFormData] = useState({
    general: initialSettings?.general || { orgName: "", orgSlug: "", timezone: "UTC", language: "en", monthlyProjectLimit: 10 },
    team: initialSettings?.team || { defaultTeamRole: "member", allowSelfAssign: true, maxTeamSize: 50, autoAssignLead: false, showTeamAsAssignee: false },
    notifications: initialSettings?.notifications || defaultNotifSettings,
  })

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({})
  const [newItems, setNewItems] = useState<Record<string, string>>({})
  const [sectionLimits, setSectionLimits] = useState<Record<string, number>>({})
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setDropdownOptions(getDropdownOptions())
    setSectionLimits(getSectionLimits())
  }, [])

  const autoSave = useCallback(async (data: typeof formData) => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    } catch {
      // silent auto-save
    }
  }, [])

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      autoSave(formData)
    }, 800)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [formData, autoSave])

  const addDropdownItem = (section: string) => {
    const val = newItems[section]?.trim()
    if (!val) return
    const updated = {
      ...dropdownOptions,
      [section]: [...(dropdownOptions[section] || []), val],
    }
    setDropdownOptions(updated)
    saveDropdownOptions(updated)
    setNewItems({ ...newItems, [section]: "" })
  }

  const removeDropdownItem = (section: string, index: number) => {
    const updated = {
      ...dropdownOptions,
      [section]: dropdownOptions[section].filter((_: string, i: number) => i !== index),
    }
    setDropdownOptions(updated)
    saveDropdownOptions(updated)
  }

  const updateSectionLimit = (section: string, value: number) => {
    const clamped = Math.max(1, Math.min(100, value))
    const updated = { ...sectionLimits, [section]: clamped }
    setSectionLimits(updated)
    saveSectionLimits(updated)
  }

  const sectionLabels: Record<string, string> = {
    projects: "Projects",
    departments: "Departments",
    locations: "Locations",
    designations: "Designations",
    employmentTypes: "Employment Types",
    statuses: "Statuses",
    branches: "Branches",
    shifts: "Shifts",
    sourceOfHires: "Source of Hires",
    countries: "Countries",
  }

  return (
    <div className="min-h-svh w-full text-foreground p-6">
      <div className="flex w-full flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, billing, and team settings.
          </p>
        </header>

        <Tabs defaultValue="account" className="gap-6">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold">Profile</h2>
                <p className="text-sm text-muted-foreground">Update your personal details and preferences.</p>
              </div>
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarImage src={initialUser.avatar} alt={fullName} className="grayscale" />
                  <AvatarFallback>{fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
                </Avatar>
                <Button variant="outline" size="sm">Change Avatar</Button>
              </div>

              <Field>
                <FieldLabel htmlFor="full-name">Full name</FieldLabel>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="email">Email address</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <FieldDescription>
                  Used for sign-in and account notices.
                </FieldDescription>
              </Field>

              <Separator />

              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="marketing-emails">
                    Marketing emails
                  </FieldLabel>
                  <FieldDescription>
                    Receive product news and occasional offers.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="marketing-emails"
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                />
              </Field>
            </div>
          </TabsContent>

          <TabsContent value="general">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">General Settings</h2>
                <p className="text-sm text-muted-foreground">Manage workspace-wide configurations and dropdown options.</p>
              </div>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(sectionLabels).map(([key, label]) => {
                  const items = dropdownOptions[key] || DEFAULT_DROPDOWN_OPTIONS[key as keyof typeof DEFAULT_DROPDOWN_OPTIONS] || []
                  const limit = sectionLimits[key] ?? DEFAULT_SECTION_LIMITS[key] ?? 20
                  const atLimit = items.length >= limit
                  return (
                    <div key={key} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">{label}</h3>
                        <Badge variant={atLimit ? "destructive" : "secondary"}>
                          {items.length}/{limit}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground shrink-0">Max limit:</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() => updateSectionLimit(key, limit - 1)}
                            disabled={limit <= 1}
                          >
                            <MinusIcon className="size-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">{limit}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            onClick={() => updateSectionLimit(key, limit + 1)}
                            disabled={limit >= 100}
                          >
                            <PlusIcon className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex flex-wrap gap-1.5">
                        {items.map((item: string, i: number) => (
                          <Badge key={i} variant="outline" className="pr-1 gap-1">
                            {item}
                            <button onClick={() => removeDropdownItem(key, i)} className="hover:text-destructive transition-colors">
                              <Trash2Icon className="size-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder=""
                          value={newItems[key] || ""}
                          onChange={(e) => setNewItems({ ...newItems, [key]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter" && !atLimit) { e.preventDefault(); addDropdownItem(key) } }}
                          disabled={atLimit}
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addDropdownItem(key)}
                          disabled={atLimit || !newItems[key]?.trim()}
                          className="h-8 shrink-0"
                        >
                          <PlusIcon className="size-3" />
                        </Button>
                      </div>
                      {atLimit && (
                        <p className="text-xs text-destructive">Maximum limit reached.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="team">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold">Team Settings</h2>
                <p className="text-sm text-muted-foreground">Configure team defaults and permissions.</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Self Assignment</Label>
                  <p className="text-xs text-muted-foreground">Members can assign tasks to themselves</p>
                </div>
                <Switch checked={formData.team.allowSelfAssign ?? true} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, allowSelfAssign: v } })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto Assign Lead</Label>
                  <p className="text-xs text-muted-foreground">Auto-assign team lead on creation</p>
                </div>
                <Switch checked={formData.team.autoAssignLead ?? false} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, autoAssignLead: v } })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Teams as Assignees</Label>
                  <p className="text-xs text-muted-foreground">When ON, show Teams in New Task form; when OFF, show Staffs</p>
                </div>
                <Switch checked={formData.team.showTeamAsAssignee ?? false} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, showTeamAsAssignee: v } })} />
              </div>
              <Separator />
              <div className="grid gap-2 max-w-xs">
                <Label htmlFor="maxTeamSize">Max Team Size</Label>
                <Input id="maxTeamSize" type="number" value={formData.team.maxTeamSize ?? 50} onChange={(e) => setFormData({ ...formData, team: { ...formData.team, maxTeamSize: parseInt(e.target.value) || 50 } })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="flex flex-col gap-0">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
                <p className="text-sm text-muted-foreground">Choose which notifications to receive.</p>
              </div>
              {Object.entries(formData.notifications).map(([key, val], i) => (
                <div key={key}>
                  {i > 0 && <Separator />}
                  <div className="flex items-center justify-between py-3">
                    <Label className="capitalize cursor-pointer">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                    <Switch checked={!!val} onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="features">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">App Sidebar Features</h2>
                <p className="text-sm text-muted-foreground">Show or hide sidebar navigation items.</p>
              </div>
              <FeatureToggleSettings />
            </div>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">Integrations</h2>
                <p className="text-sm text-muted-foreground">Connect external services and manage integrations.</p>
              </div>
              <IntegrationsBlock />
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}


function FeatureToggleSettings() {
  const [hidden, setHidden] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/sidebar-features", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.hidden) setHidden(data.hidden)
      })
      .catch(() => {})
    return () => controller.abort();
  }, [])

  async function handleToggle(feature: string) {
    const next = hidden.includes(feature)
      ? hidden.filter((f) => f !== feature)
      : [...hidden, feature]
    setHidden(next)
    setSaving(true)
    try {
      await fetch("/api/sidebar-features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: next }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const featureDescriptions: Record<string, string> = {
    Dashboard: "Overview and reports at a glance",
    "Task Allocation": "Assign and track team tasks",
    Employees: "Manage employees, teams, and attendance",
    Projects: "Track clients and project progress",
    Approvals: "Review pending, approved, and rejected requests",
    "Time Tracker": "Log and monitor work hours",
    Billing: "View invoices, services, and receipts",
    Chat: "Workspace messaging and collaboration",
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {SIDEBAR_FEATURES.map((feature) => {
          const isHidden = hidden.includes(feature)
          return (
            <div key={feature} className={`border rounded-lg p-4 ${isHidden ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-none">{feature}</p>
                  <p className="text-xs text-muted-foreground">
                    {featureDescriptions[feature]}
                  </p>
                </div>
                <Button
                  variant={isHidden ? "default" : "outline"}
                  size="sm"
                  className="shrink-0"
                  onClick={() => handleToggle(feature)}
                  disabled={saving}
                >
                  {isHidden ? "Unhide" : "Hide"}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
      {saved && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2Icon className="size-4" /> Saved
        </div>
      )}
    </div>
  )
}
