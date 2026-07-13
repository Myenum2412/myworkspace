"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import {
  Settings2Icon,
  UsersIcon,
  BellIcon,
  PlugIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  PlusIcon,
  Trash2Icon,
  ArrowUpRightIcon,
  MinusIcon,
  EyeOffIcon,
  MessageCircleIcon,
  XCircleIcon,
  SmartphoneIcon,
  CalendarIcon,
  UnplugIcon,
  AlertCircleIcon,
  BrainIcon,
  BotIcon,
} from "lucide-react";
import { getDropdownOptions, saveDropdownOptions, DEFAULT_DROPDOWN_OPTIONS } from "@/lib/dropdown-options";
import { SIDEBAR_FEATURES } from "@/lib/sidebar-features";
import MCPPortalClient from "@/app/mcp/mcp-portal.client";

const SECTION_LIMITS_KEY = "myworkspace_section_limits";

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
};

function getSectionLimits(): Record<string, number> {
  if (typeof window === "undefined") return DEFAULT_SECTION_LIMITS;
  try {
    const stored = localStorage.getItem(SECTION_LIMITS_KEY);
    if (stored) return { ...DEFAULT_SECTION_LIMITS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_SECTION_LIMITS;
}

function saveSectionLimits(limits: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SECTION_LIMITS_KEY, JSON.stringify(limits));
}

  export type SettingsPageClientProps = {
  orgId: string;
  user: { name: string; email: string; avatar: string };
  initialSettings: {
    general?: { orgName?: string; orgSlug?: string; timezone?: string; language?: string; monthlyProjectLimit?: number };
    team?: { defaultTeamRole?: string; allowSelfAssign?: boolean; maxTeamSize?: number; autoAssignLead?: boolean; showTeamAsAssignee?: boolean };
    notifications?: {
      taskAssigned?: boolean;
      taskStatusChange?: boolean;
      taskComments?: boolean;
      dueDateReminders?: boolean;
      memberJoinLeave?: boolean;
      teamMentions?: boolean;
      projectUpdates?: boolean;
      securityAlerts?: boolean;
      billingUpdates?: boolean;
      featureAnnouncements?: boolean;
    };
  } | null;
};

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
};

export function SettingsPageClient({ orgId, user: initialUser, initialSettings }: SettingsPageClientProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    general: initialSettings?.general || { orgName: "", orgSlug: "", timezone: "UTC", language: "en", monthlyProjectLimit: 10 },
    team: initialSettings?.team || { defaultTeamRole: "member", allowSelfAssign: true, maxTeamSize: 50, autoAssignLead: false, showTeamAsAssignee: false },
    notifications: initialSettings?.notifications || defaultNotifSettings,
  });

  const [dropdownOptions, setDropdownOptions] = useState<Record<string, string[]>>({});
  const [newItems, setNewItems] = useState<Record<string, string>>({});
  const [sectionLimits, setSectionLimits] = useState<Record<string, number>>({});

  useEffect(() => {
    setDropdownOptions(getDropdownOptions());
    setSectionLimits(getSectionLimits());
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setSaved(true);
      } else {
        console.error("Failed to save settings");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const addDropdownItem = (section: string) => {
    const val = newItems[section]?.trim();
    if (!val) return;
    const updated = {
      ...dropdownOptions,
      [section]: [...(dropdownOptions[section] || []), val],
    };
    setDropdownOptions(updated);
    saveDropdownOptions(updated);
    setNewItems({ ...newItems, [section]: "" });
  };

  const removeDropdownItem = (section: string, index: number) => {
    const updated = {
      ...dropdownOptions,
      [section]: dropdownOptions[section].filter((_, i) => i !== index),
    };
    setDropdownOptions(updated);
    saveDropdownOptions(updated);
  };

  const updateSectionLimit = (section: string, value: number) => {
    const clamped = Math.max(1, Math.min(100, value));
    const updated = { ...sectionLimits, [section]: clamped };
    setSectionLimits(updated);
    saveSectionLimits(updated);
  };

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
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 max-w-full">
      <div className="border-b p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace preferences</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <SaveIcon className="size-4 mr-1" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2Icon className="size-4" /> Saved
              </span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="general" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-3 sm:px-4 md:px-6 overflow-x-auto">
          <TabsList className="h-10 w-full sm:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <Settings2Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">General</span>
              <span className="sm:hidden">Gen</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <UsersIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">Team</span>
              <span className="sm:hidden">Team</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <BellIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notif</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="gap-2">
              <EyeOffIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">Features</span>
              <span className="sm:hidden">Feat</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2">
              <PlugIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">Integrations</span>
              <span className="sm:hidden">Integ</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <BrainIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">AI Soul</span>
              <span className="sm:hidden">Soul</span>
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <BotIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">MCP</span>
              <span className="sm:hidden">MCP</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="general" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">General Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage workspace-wide configurations</p>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Section Cards</h2>
                  <p className="text-sm text-muted-foreground">Manage dropdown options and set maximum item limits for each section.</p>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                  {Object.entries(sectionLabels).map(([key, label]) => {
                    const items = dropdownOptions[key] || DEFAULT_DROPDOWN_OPTIONS[key as keyof typeof DEFAULT_DROPDOWN_OPTIONS] || [];
                    const limit = sectionLimits[key] ?? DEFAULT_SECTION_LIMITS[key] ?? 20;
                    const atLimit = items.length >= limit;
                    return (
                      <Card key={key}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">{label}</CardTitle>
                            <Badge variant={atLimit ? "destructive" : "secondary"}>
                              {items.length}/{limit}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
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
                            {items.map((item, i) => (
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
                              onKeyDown={(e) => { if (e.key === "Enter" && !atLimit) { e.preventDefault(); addDropdownItem(key); } }}
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
                            <p className="text-xs text-destructive">Maximum limit reached. Increase the limit to add more items.</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="team" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Team Settings</h2>
                  <p className="text-sm text-muted-foreground">Configure team defaults and permissions</p>
                </div>
                <Card>
                  <CardContent className="grid gap-4 pt-6">
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
                        <p className="text-xs text-muted-foreground">When turned ON, show Teams in New Task form; when turned OFF, show Staffs</p>
                      </div>
                      <Switch checked={formData.team.showTeamAsAssignee ?? false} onCheckedChange={(v) => setFormData({ ...formData, team: { ...formData.team, showTeamAsAssignee: v } })} />
                    </div>
                    <Separator />
                    <div className="grid gap-2 max-w-xs">
                      <Label htmlFor="maxTeamSize">Max Team Size</Label>
                      <Input id="maxTeamSize" type="number" value={formData.team.maxTeamSize ?? 50} onChange={(e) => setFormData({ ...formData, team: { ...formData.team, maxTeamSize: parseInt(e.target.value) || 50 } })} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notifications" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Notification Preferences</h2>
                  <p className="text-sm text-muted-foreground">Choose which notifications to receive</p>
                </div>
                <Card>
                  <CardContent className="grid gap-0 pt-6">
                    {Object.entries(formData.notifications).map(([key, val], i) => (
                      <div key={key}>
                        {i > 0 && <Separator />}
                        <div className="flex items-center justify-between py-3">
                          <Label className="capitalize cursor-pointer">{key.replace(/([A-Z])/g, " $1").trim()}</Label>
                          <Switch checked={!!val} onCheckedChange={(v) => setFormData({ ...formData, notifications: { ...formData.notifications, [key]: v } })} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="features" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">App Sidebar Features</h2>
                  <p className="text-sm text-muted-foreground">Show or hide sidebar navigation items</p>
                </div>
                <FeatureToggleSettings />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="integrations" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Integrations</h2>
                  <p className="text-sm text-muted-foreground">Configure third-party integrations</p>
                </div>
                <CalendarIntegrations />
                <Separator />
                <WhatsAppSettings />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="ai" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <AISoulSettings orgId={orgId} initialSoul={(initialSettings as any)?.aiSoul || ""} />
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value="mcp" className="h-full m-0 p-0">
            <MCPPortalClient />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}


function FeatureToggleSettings() {
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/sidebar-features")
      .then((r) => r.json())
      .then((data) => {
        if (data.hidden) setHidden(data.hidden);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(feature: string) {
    const next = hidden.includes(feature)
      ? hidden.filter((f) => f !== feature)
      : [...hidden, feature];
    setHidden(next);
    setSaving(true);
    try {
      await fetch("/api/sidebar-features", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidden: next }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const featureDescriptions: Record<string, string> = {
    Dashboard: "Overview and reports at a glance",
    "Task Allocation": "Assign and track team tasks",
    Employees: "Manage employees, teams, and attendance",
    Projects: "Track clients and project progress",
    Approvals: "Review pending, approved, and rejected requests",
    "Time Tracker": "Log and monitor work hours",
    "File Manager": "Store, upload, and manage files",
    Billing: "View invoices, services, and receipts",
    Chat: "Workspace messaging and collaboration",
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {SIDEBAR_FEATURES.map((feature) => {
          const isHidden = hidden.includes(feature);
          return (
            <Card key={feature} className={isHidden ? "opacity-60" : ""}>
              <div className="flex items-start justify-between p-4 gap-4">
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
            </Card>
          );
        })}
      </div>
      {saved && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <CheckCircle2Icon className="size-4" /> Saved
        </div>
      )}
    </div>
  );
}

function WhatsAppSettings() {
  const [state, setState] = useState<{
    status: string;
    qrCode?: string;
    phoneNumber?: string;
    error?: string;
    info?: { me: string; phone: string; platform: string };
  }>({ status: "disconnected" });
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    fetch("/api/whatsapp/status", { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setState(d.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const interval = setInterval(() => {
      if (state.status === "initializing" || state.status === "qr") {
        fetch("/api/whatsapp/status")
          .then((r) => r.json())
          .then((d) => {
            if (!cancelled && d.success) setState(d.data);
          })
          .catch(() => {});
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state.status]);

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch("/api/whatsapp/start", { method: "POST" });
      const data = await res.json();
      if (data.success) setState(data.data);
    } catch {
      setState({ status: "error", error: "Failed to start client" });
    } finally {
      setStarting(false);
    }
  }

  async function handleStop() {
    await fetch("/api/whatsapp/stop", { method: "POST" });
    setState({ status: "disconnected" });
  }

  async function handleLogout() {
    await fetch("/api/whatsapp/logout", { method: "POST" });
    setState({ status: "disconnected" });
  }

  async function handleSendMessage() {
    if (!recipient.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("");
        alert("Message sent successfully!");
      } else {
        // Show detailed error
        alert(`Error: ${data.error || "Failed to send message"}\n\nStatus: ${state.status}\nPhone: ${state.phoneNumber || "N/A"}`);
      }
    } catch (err) {
      alert(`Network error: ${err}`);
    } finally {
      setSending(false);
    }
  }

  const statusBadge = () => {
    switch (state.status) {
      case "ready":
        return <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2Icon className="size-4" /> Connected</span>;
      case "initializing":
        return <span className="flex items-center gap-1 text-sm text-amber-600"><Loader2Icon className="size-4 animate-spin" /> Initializing...</span>;
      case "qr":
        return <span className="flex items-center gap-1 text-sm text-amber-600"><Loader2Icon className="size-4 animate-spin" /> Awaiting scan</span>;
      case "authenticated":
        return <span className="flex items-center gap-1 text-sm text-amber-600"><Loader2Icon className="size-4 animate-spin" /> Authenticated</span>;
      case "error":
        return <span className="flex items-center gap-1 text-sm text-red-600"><XCircleIcon className="size-4" /> Error</span>;
      default:
        return <span className="flex items-center gap-1 text-sm text-muted-foreground"><SmartphoneIcon className="size-4" /> Disconnected</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Integration</CardTitle>
        <CardDescription>
          Connect your workspace with WhatsApp using the whatsapp library. Scan the QR code with your phone to authenticate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {statusBadge()}
          {state.phoneNumber && (
            <span className="text-sm text-muted-foreground ml-2">{state.phoneNumber}</span>
          )}
        </div>

        {state.status === "disconnected" && (
          <div className="flex flex-col items-start gap-3">
            <Button onClick={handleStart} disabled={starting}>
              {starting ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <SmartphoneIcon className="mr-2 size-4" />}
              {starting ? "Starting..." : "Start WhatsApp Client"}
            </Button>
          </div>
        )}

        {state.status === "initializing" && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Initializing WhatsApp client...
          </div>
        )}

        {state.status === "qr" && state.qrCode && (
          <div className="flex flex-col items-center gap-3">
            <img src={state.qrCode} alt="QR Code" className="rounded-lg border" />
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Open WhatsApp on your phone → Linked Devices → Link a Device → Scan this QR code.
            </p>
            <Button variant="outline" size="sm" onClick={handleStop}>Cancel</Button>
          </div>
        )}

        {state.status === "ready" && (
          <div className="space-y-4">
            {state.info && (
              <div className="text-sm text-muted-foreground">
                <p>Phone: {state.info.me}</p>
                <p>Platform: {state.info.platform}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="recipient">Send Test Message</Label>
              <Input
                id="recipient"
                placeholder=""
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
              <Input
                placeholder=""
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} disabled={sending || !recipient.trim() || !message.trim()}>
                {sending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Send Message
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Disconnect & Logout
            </Button>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm text-red-500">{state.error || "Connection failed"}</p>
            <Button size="sm" onClick={handleStart}>Retry</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type CalendarConnection = {
  id: string;
  provider: "google" | "microsoft";
  calendarEmail: string;
  calendarName: string;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  createdAt: string;
};

function CalendarIntegrations() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchConnections = async () => {
      try {
        const res = await fetch("/api/calendar/connections");
        const data = await res.json();
        if (!cancelled) setConnections(data.data || []);
      } catch {
        console.error("Failed to fetch connections");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchConnections();
    return () => { cancelled = true; };
  }, []);

  const handleDisconnect = async (connectionId: string) => {
    setDisconnecting(connectionId);
    try {
      await fetch(`/api/calendar/connections?id=${connectionId}`, { method: "DELETE" });
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
    } catch {
      console.error("Failed to disconnect");
    } finally {
      setDisconnecting(null);
    }
  };

  const googleConnection = connections.find((c) => c.provider === "google");
  const microsoftConnection = connections.find((c) => c.provider === "microsoft");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Google Calendar</CardTitle>
                <CardDescription>Sync events from your Google Calendar</CardDescription>
              </div>
            </div>
            {googleConnection ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle2Icon className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {googleConnection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Connected as:</span>
                <span className="font-medium text-foreground">{googleConnection.calendarEmail}</span>
              </div>
              {googleConnection.lastSyncAt && (
                <div className="text-xs text-muted-foreground">
                  Last synced: {new Date(googleConnection.lastSyncAt).toLocaleString()}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(googleConnection.id)}
                disabled={disconnecting === googleConnection.id}
              >
                {disconnecting === googleConnection.id ? (
                  <Loader2Icon className="size-4 mr-1 animate-spin" />
                ) : (
                  <UnplugIcon className="size-4 mr-1" />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button asChild>
                <a href="/api/calendar/google">
                  <CalendarIcon className="size-4 mr-2" />
                  Connect Google Calendar
                </a>
              </Button>
              <span className="text-xs text-muted-foreground">
                Read-only access to view your events
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Microsoft Outlook */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.4 2H2v20h9V9.6L22 2v20h-9" fill="#0078D4"/>
                  <path d="M11.4 9.6V22H2V9.6l9.4-7.6z" fill="#0078D4" opacity="0.8"/>
                  <path d="M22 2l-10.6 7.6V2H22z" fill="#0078D4" opacity="0.6"/>
                </svg>
              </div>
              <div>
                <CardTitle className="text-base">Microsoft Outlook</CardTitle>
                <CardDescription>Sync events from your Outlook Calendar</CardDescription>
              </div>
            </div>
            {microsoftConnection ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle2Icon className="size-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {microsoftConnection ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Connected as:</span>
                <span className="font-medium text-foreground">{microsoftConnection.calendarEmail}</span>
              </div>
              {microsoftConnection.lastSyncAt && (
                <div className="text-xs text-muted-foreground">
                  Last synced: {new Date(microsoftConnection.lastSyncAt).toLocaleString()}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(microsoftConnection.id)}
                disabled={disconnecting === microsoftConnection.id}
              >
                {disconnecting === microsoftConnection.id ? (
                  <Loader2Icon className="size-4 mr-1 animate-spin" />
                ) : (
                  <UnplugIcon className="size-4 mr-1" />
                )}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
          <Button asChild>
                  <a href="/api/calendar/microsoft">
                    <CalendarIcon className="size-4 mr-2" />
                    Connect Outlook Calendar
                  </a>
                </Button>
                <span className="text-xs text-muted-foreground">
                  Read-only access to view your events
                </span>
              </div>
              {process.env.MICROSOFT_CLIENT_ID === "YOUR_MICROSOFT_CLIENT_ID" && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>Microsoft integration requires Azure AD credentials. Contact your admin to configure.</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AISoulSettings({ orgId, initialSoul }: { orgId: string; initialSoul: string }) {
  const [soul, setSoul] = useState(initialSoul);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/ai-soul?orgId=${orgId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSoul(d.data.aiSoul); })
      .catch(() => {});
  }, [orgId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings/ai-soul", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, aiSoul: soul }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">AI Soul (soul.md)</h2>
        <p className="text-sm text-muted-foreground">
          Define the AI assistant personality and behavior rules. This is loaded by the MCP server at the start of every AI session and used to personalize all AI interactions.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aiSoul">soul.md</Label>
            <textarea
              id="aiSoul"
              className="w-full min-h-[300px] font-mono text-sm p-3 rounded-lg border bg-background resize-y"
              placeholder="# AI Soul / Personality

You are a helpful assistant for MyWorkSpace.

## Tone
- Friendly and professional
- Use simple language

## Rules
- Never make up product information
- Keep responses under 3-4 sentences
- ..."
              value={soul}
              onChange={(e) => { setSoul(e.target.value); setSaved(false); }}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <SaveIcon className="size-4 mr-1" />}
              {saving ? "Saving..." : "Save Soul"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2Icon className="size-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


