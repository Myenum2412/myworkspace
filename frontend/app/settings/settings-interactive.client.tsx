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
  RiShieldCheckLine,
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
import IntegrationsBlock from "@/components/integrations-block"
import AuthenticatorSettings from "@/components/authenticator-settings"
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
  user: { name: string; email: string; avatar: string }
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

export function SettingsPageClient({ orgId, user: initialUser, initialSettings }: SettingsPageClientProps) {
  const [fullName, setFullName] = useState(initialUser.name)
  const [email, setEmail] = useState(initialUser.email)
  const [marketingEmails, setMarketingEmails] = useState(true)

  const [formData, setFormData] = useState({
    general: initialSettings?.general || { orgName: "", orgSlug: "", timezone: "UTC", language: "en", monthlyProjectLimit: 10 },
    team: initialSettings?.team || { defaultTeamRole: "team_staff", allowSelfAssign: true, maxTeamSize: 50, autoAssignLead: false, showTeamAsAssignee: false },
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
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
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
                  <Label>Show Teams as Assignees</Label>
                  <p className="text-xs text-muted-foreground">When ON, show Teams in New Task form; when OFF, show Staffs</p>
                </div>
                <Switch checked={formData.team.showTeamAsAssignee ?? false} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, showTeamAsAssignee: v } })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-lg font-semibold">Notification Preferences</h2>
                <p className="text-sm text-muted-foreground">Choose which notifications you want to receive across different channels.</p>
              </div>

              {/* Task Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Tasks</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "taskAssigned", label: "Task Assigned", desc: "When a task is assigned to you" },
                    { key: "taskStatusChange", label: "Task Status Changes", desc: "When task status is updated" },
                    { key: "taskComments", label: "Task Comments", desc: "When someone comments on your task" },
                    { key: "taskMentions", label: "Task Mentions", desc: "When you're mentioned in a task" },
                    { key: "dueDateReminders", label: "Due Date Reminders", desc: "Reminders before task due dates" },
                    { key: "taskDeadlines", label: "Task Deadlines", desc: "When a task deadline is approaching" },
                    { key: "taskCompleted", label: "Task Completed", desc: "When a task you're involved in is completed" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Projects</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "projectUpdates", label: "Project Updates", desc: "When project details are updated" },
                    { key: "projectMentions", label: "Project Mentions", desc: "When you're mentioned in a project" },
                    { key: "projectMilestones", label: "Project Milestones", desc: "When a milestone is reached" },
                    { key: "projectDeadlines", label: "Project Deadlines", desc: "When project deadlines approach" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Team</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "memberJoinLeave", label: "Member Join/Leave", desc: "When team members join or leave" },
                    { key: "teamMentions", label: "Team Mentions", desc: "When you're mentioned in team chat" },
                    { key: "teamUpdates", label: "Team Updates", desc: "When team settings or details change" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Calendar</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "calendarReminders", label: "Calendar Reminders", desc: "Reminders for upcoming events" },
                    { key: "meetingReminders", label: "Meeting Reminders", desc: "Reminders before meetings start" },
                    { key: "meetingInvitations", label: "Meeting Invitations", desc: "When you're invited to a meeting" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* System Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">System</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "securityAlerts", label: "Security Alerts", desc: "Important security notifications" },
                    { key: "billingUpdates", label: "Billing Updates", desc: "Payment and subscription updates" },
                    { key: "systemUpdates", label: "System Updates", desc: "Platform updates and maintenance" },
                    { key: "featureAnnouncements", label: "Feature Announcements", desc: "New features and improvements" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Email</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "emailDigest", label: "Email Digest", desc: "Receive periodic email summaries" },
                    { key: "weeklyReport", label: "Weekly Report", desc: "Weekly activity summary" },
                    { key: "dailySummary", label: "Daily Summary", desc: "Daily activity summary" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Push Notifications */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground">Push Notifications</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-3">
                  {[
                    { key: "pushEnabled", label: "Enable Push Notifications", desc: "Receive push notifications on your devices" },
                    { key: "pushTaskUpdates", label: "Task Updates", desc: "Push notifications for task changes" },
                    { key: "pushCalendarEvents", label: "Calendar Events", desc: "Push notifications for calendar events" },
                    { key: "pushTeamMessages", label: "Team Messages", desc: "Push notifications for team messages" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-2">
                      <div>
                        <Label className="text-sm cursor-pointer">{label}</Label>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <Switch
                        checked={!!formData.notifications[key as keyof typeof formData.notifications]}
                        onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Automation Link */}
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" asChild>
                  <a href="/settings/email-automation" className="gap-2">
                    <RiMailLine className="size-4" />
                    Configure Daily Task Email Scheduler
                  </a>
                </Button>
              </div>
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
              <AuthenticatorSettings />
            </div>
          </TabsContent>
        </Tabs>

      </div>
    </div>
  )
}


