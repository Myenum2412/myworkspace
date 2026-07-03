"use client";

import { useState, useEffect } from "react";
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
  CreditCardIcon,
  BellIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  PlusIcon,
  Trash2Icon,
  ArrowUpRightIcon,
  MinusIcon,
} from "lucide-react";
import { getDropdownOptions, saveDropdownOptions, DEFAULT_DROPDOWN_OPTIONS } from "@/lib/dropdown-options";

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
    <div className="flex flex-col h-full w-full">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace preferences</p>
          </div>
          <div className="flex items-center gap-2">
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
        <div className="border-b px-6">
          <TabsList className="h-10">
            <TabsTrigger value="general" className="gap-2">
              <Settings2Icon className="size-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <UsersIcon className="size-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCardIcon className="size-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <BellIcon className="size-4" />
              Notifications
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="general" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">General Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage workspace-wide configurations</p>
                </div>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Project Target</CardTitle>
                    <CardDescription>Set your target goals for monthly project creation</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2 max-w-xs">
                      <Label htmlFor="monthlyProjectLimit">Monthly Project Target</Label>
                      <Input
                        id="monthlyProjectLimit"
                        type="number"
                        min={1}
                        value={formData.general.monthlyProjectLimit ?? 10}
                        onChange={(e) => setFormData({ ...formData, general: { ...formData.general, monthlyProjectLimit: parseInt(e.target.value) || 1 } })}
                      />
                    </div>
                  </CardContent>
                </Card>
                <Separator />
                <div>
                  <h2 className="text-lg font-semibold">Section Cards</h2>
                  <p className="text-sm text-muted-foreground">Manage dropdown options and set maximum item limits for each section.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
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
                              placeholder="Add item..."
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
              <div className="p-6 space-y-6">
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

          <TabsContent value="billing" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Billing</h2>
                  <p className="text-sm text-muted-foreground">Manage your subscription and invoices</p>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                    <CardDescription>View and manage your current plan</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="default">
                      <Link href="/settings/plans">
                        View Plans & Billing
                        <ArrowUpRightIcon className="size-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notifications" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
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
        </div>
      </Tabs>
    </div>
  );
}
