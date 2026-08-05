"use client"

import { useState, useEffect, useCallback, useRef, type CSSProperties } from "react"
import { toast } from "sonner"
import {
  RiMailLine,
  RiUserLine,
  RiSettings2Line,
  RiTeamLine,
  RiNotification3Line,
  RiLayout2Line,
  RiLink,
  RiShieldCheckLine,
} from "@remixicon/react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Field,
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
import IntegrationsBlock from "@/components/integrations-block"
import { INDUSTRIES, type Industry } from "@/lib/industry-terms"
import { useIndustry } from "@/components/industry-provider"
import {
  Loader2Icon,
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
  user: { name: string; email: string; avatar: string; role: string }
  initialSettings: {
    general?: { orgName?: string; orgSlug?: string; timezone?: string; language?: string; monthlyProjectLimit?: number }
    team?: { defaultTeamRole?: string; allowSelfAssign?: boolean; maxTeamSize?: number; autoAssignLead?: boolean; showTeamAsAssignee?: boolean }
    notifications?: {
      taskAssigned?: boolean
      taskStatusChange?: boolean
      taskComments?: boolean
      taskMentions?: boolean
      dueDateReminders?: boolean
      taskDeadlines?: boolean
      taskCompleted?: boolean
      projectUpdates?: boolean
      projectMentions?: boolean
      projectMilestones?: boolean
      projectDeadlines?: boolean
      memberJoinLeave?: boolean
      teamMentions?: boolean
      teamUpdates?: boolean
      calendarReminders?: boolean
      meetingReminders?: boolean
      meetingInvitations?: boolean
      securityAlerts?: boolean
      billingUpdates?: boolean
      systemUpdates?: boolean
      featureAnnouncements?: boolean
      emailDigest?: boolean
      weeklyReport?: boolean
      dailySummary?: boolean
      pushEnabled?: boolean
      pushTaskUpdates?: boolean
      pushCalendarEvents?: boolean
      pushTeamMessages?: boolean
    }
  } | null
}

const defaultNotifSettings = {
  // Task Notifications
  taskAssigned: true,
  taskStatusChange: true,
  taskComments: true,
  taskMentions: true,
  dueDateReminders: true,
  taskDeadlines: true,
  taskCompleted: true,

  // Project Notifications
  projectUpdates: true,
  projectMentions: true,
  projectMilestones: true,
  projectDeadlines: true,

  // Team Notifications
  memberJoinLeave: true,
  teamMentions: true,
  teamUpdates: true,

  // Calendar Notifications
  calendarReminders: true,
  meetingReminders: true,
  meetingInvitations: true,

  // System Notifications
  securityAlerts: true,
  billingUpdates: true,
  systemUpdates: true,
  featureAnnouncements: true,

  // Email Notifications
  emailDigest: true,
  weeklyReport: true,
  dailySummary: true,

  // Push Notifications
  pushEnabled: true,
  pushTaskUpdates: true,
  pushCalendarEvents: true,
  pushTeamMessages: true,
}

function WorkspaceIndustrySelect() {
  const { industry, setIndustry } = useIndustry()
  const [saving, setSaving] = useState(false)

  const handleChange = async (value: string) => {
    setSaving(true)
    await setIndustry(value as Industry)
    setSaving(false)
  }

  return (
    <Select value={industry} onValueChange={handleChange} disabled={saving}>
      <SelectTrigger className="w-full sm:w-[300px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INDUSTRIES.map((ind) => (
          <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function SettingsPageClient({ orgId, user: initialUser, initialSettings }: SettingsPageClientProps) {
  const [fullName, setFullName] = useState(initialUser.name)
  const [email, setEmail] = useState(initialUser.email)
  const [marketingEmails, setMarketingEmails] = useState(true)

  const [formData, setFormData] = useState({
    general: initialSettings?.general || { orgName: "", orgSlug: "", timezone: "UTC", language: "en", monthlyProjectLimit: 10 },
    team: initialSettings?.team || { defaultTeamRole: "team_staff", allowSelfAssign: true, maxTeamSize: 50, autoAssignLead: false, showTeamAsAssignee: false },
    notifications: { ...defaultNotifSettings, ...initialSettings?.notifications },
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
    <div
      className="min-h-svh w-full text-foreground"
      style={{ "--primary": "#1f6feb" } as CSSProperties}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight" data-tour-step-id="step-settings">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your account, billing, and team settings.
          </p>
        </header>

        <Tabs defaultValue="account" className="gap-6">
          <TabsList className="h-11 w-full justify-start gap-1 overflow-x-auto rounded-xl border bg-muted/30 p-1 sm:w-auto">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <div className="flex flex-col gap-6">
              <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 className="text-base font-semibold">Profile</h2>
                <p className="mt-1 text-sm text-muted-foreground">Update your personal details and preferences.</p>

                <div className="mt-5 flex items-center gap-4">
                  <Avatar className="size-14">
                    <AvatarImage src={initialUser.avatar} alt={fullName} className="grayscale" />
                    <AvatarFallback>{fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">Change Avatar</Button>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="full-name">Full name</FieldLabel>
                    <Input
                      id="full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="h-9 rounded-lg"
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
                      className="h-9 rounded-lg"
                    />
                    <FieldDescription>
                      Used for sign-in and account notices.
                    </FieldDescription>
                  </Field>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Marketing emails</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Receive product news and occasional offers.
                    </p>
                  </div>
                  <Switch
                    id="marketing-emails"
                    checked={marketingEmails}
                    onCheckedChange={setMarketingEmails}
                  />
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="general">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold">General Settings</h2>
                <p className="text-sm text-muted-foreground">Manage workspace-wide configurations and dropdown options.</p>
              </div>

              <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div>
                  <h3 className="text-sm font-medium">Workspace Industry</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Select the industry for your workspace. This customizes the terminology used across the application.</p>
                </div>
                <div className="mt-4">
                  <WorkspaceIndustrySelect />
                </div>
              </section>

               <div className="grid gap-5 grid-cols-1 sm:grid-cols-2">
                {Object.entries(sectionLabels).map(([key, label]) => {
                  const items = dropdownOptions[key] || DEFAULT_DROPDOWN_OPTIONS[key as keyof typeof DEFAULT_DROPDOWN_OPTIONS] || []
                  const limit = sectionLimits[key] ?? DEFAULT_SECTION_LIMITS[key] ?? 20
                  const atLimit = items.length >= limit
                  return (
                    <section key={key} className="rounded-2xl border border-border bg-white p-5 shadow-sm space-y-3">
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
                            className=""
                            onClick={() => updateSectionLimit(key, limit - 1)}
                            disabled={limit <= 1}
                          >
                            <MinusIcon className="size-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">{limit}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className=""
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
                          className="h-9 rounded-lg text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addDropdownItem(key)}
                          disabled={atLimit || !newItems[key]?.trim()}
                          className="shrink-0"
                        >
                          <PlusIcon className="size-3" />
                        </Button>
                      </div>
                      {atLimit && (
                        <p className="text-xs text-destructive">Maximum limit reached.</p>
                      )}
                    </section>
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
              <section className="divide-y divide-border rounded-2xl border border-border bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="space-y-0.5">
                    <Label>Allow Self Assignment</Label>
                    <p className="text-xs text-muted-foreground">Members can assign tasks to themselves</p>
                  </div>
                  <Switch checked={formData.team.allowSelfAssign ?? true} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, allowSelfAssign: v } })} />
                </div>
                <div className="flex items-center justify-between gap-4 p-5">
                  <div className="space-y-0.5">
                    <Label>Show Teams as Assignees</Label>
                    <p className="text-xs text-muted-foreground">When ON, show Teams in New Task form; when OFF, show Staffs</p>
                  </div>
                  <Switch checked={formData.team.showTeamAsAssignee ?? false} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, showTeamAsAssignee: v } })} />
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
                <p className="text-sm text-muted-foreground">Choose which notifications you want to receive across different channels.</p>
              </div>

              {/* Task Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "taskAssigned", label: "Task Assigned", desc: "When a task is assigned to you" },
                    { key: "taskStatusChange", label: "Task Status Changes", desc: "When task status is updated" },
                    { key: "taskComments", label: "Task Comments", desc: "When someone comments on your task" },
                    { key: "taskMentions", label: "Task Mentions", desc: "When you're mentioned in a task" },
                    { key: "dueDateReminders", label: "Due Date Reminders", desc: "Reminders before task due dates" },
                    { key: "taskDeadlines", label: "Task Deadlines", desc: "When a task deadline is approaching" },
                    { key: "taskCompleted", label: "Task Completed", desc: "When a task you're involved in is completed" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Project Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Projects</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "projectUpdates", label: "Project Updates", desc: "When project details are updated" },
                    { key: "projectMentions", label: "Project Mentions", desc: "When you're mentioned in a project" },
                    { key: "projectMilestones", label: "Project Milestones", desc: "When a milestone is reached" },
                    { key: "projectDeadlines", label: "Project Deadlines", desc: "When project deadlines approach" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Team Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Team</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "memberJoinLeave", label: "Member Join/Leave", desc: "When team members join or leave" },
                    { key: "teamMentions", label: "Team Mentions", desc: "When you're mentioned in team chat" },
                    { key: "teamUpdates", label: "Team Updates", desc: "When team settings or details change" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Calendar Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Calendar</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "calendarReminders", label: "Calendar Reminders", desc: "Reminders for upcoming events" },
                    { key: "meetingReminders", label: "Meeting Reminders", desc: "Reminders before meetings start" },
                    { key: "meetingInvitations", label: "Meeting Invitations", desc: "When you're invited to a meeting" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* System Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">System</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "securityAlerts", label: "Security Alerts", desc: "Important security notifications" },
                    { key: "billingUpdates", label: "Billing Updates", desc: "Payment and subscription updates" },
                    { key: "systemUpdates", label: "System Updates", desc: "Platform updates and maintenance" },
                    { key: "featureAnnouncements", label: "Feature Announcements", desc: "New features and improvements" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Email Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Email</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "emailDigest", label: "Email Digest", desc: "Receive periodic email summaries" },
                    { key: "weeklyReport", label: "Weekly Report", desc: "Weekly activity summary" },
                    { key: "dailySummary", label: "Daily Summary", desc: "Daily activity summary" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Push Notifications */}
              <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { key: "pushEnabled", label: "Enable Push Notifications", desc: "Receive push notifications on your devices" },
                    { key: "pushTaskUpdates", label: "Task Updates", desc: "Push notifications for task changes" },
                    { key: "pushCalendarEvents", label: "Calendar Events", desc: "Push notifications for calendar events" },
                    { key: "pushTeamMessages", label: "Team Messages", desc: "Push notifications for team messages" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between gap-4 px-5 py-3.5">
                      <div>
                        <Label className="text-sm cursor-pointer font-medium">{label}</Label>
                        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Email Automation Link */}
              <Button variant="outline" asChild className="justify-start gap-2 self-start rounded-lg">
                <a href="/settings/email-automation">
                  <RiMailLine className="size-4" />
                  Configure Daily Task Email Scheduler
                </a>
              </Button>
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

          <TabsContent value="security">
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">Security</h2>
                <p className="text-sm text-muted-foreground">Manage your account security and authentication methods.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}


