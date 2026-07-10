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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { InstallForWindows } from "@/components/install-for-windows";
import {
  Settings2Icon,
  UsersIcon,
  CreditCardIcon,
  BellIcon,
  PlugIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  PlusIcon,
  Trash2Icon,
  ArrowUpRightIcon,
  MinusIcon,
  CheckIcon,
  XIcon,
  Star,
  MessageCircleIcon,
  QrCodeIcon,
  EyeOffIcon,
} from "lucide-react";
import { getDropdownOptions, saveDropdownOptions, DEFAULT_DROPDOWN_OPTIONS } from "@/lib/dropdown-options";
import { SIDEBAR_FEATURES } from "@/lib/sidebar-features";

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
            <InstallForWindows />
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
            <TabsTrigger value="billing" className="gap-2">
              <CreditCardIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">Billing</span>
              <span className="sm:hidden">Bill</span>
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
            <TabsTrigger value="whatsapp" className="gap-2">
              <MessageCircleIcon className="size-4 shrink-0" />
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="sm:hidden">WA</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="gap-2" asChild>
              <a href="/settings/integrations" className="flex items-center gap-2">
                <PlugIcon className="size-4 shrink-0" />
                <span className="hidden sm:inline">Integrations</span>
                <span className="sm:hidden">Integ</span>
              </a>
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

          <TabsContent value="billing" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">Billing</h2>
                  <p className="text-sm text-muted-foreground">Compare plans and manage your subscription</p>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle>Plans</CardTitle>
                    <CardDescription>Choose the plan that fits your needs</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Feature</TableHead>
                          <TableHead className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-base font-bold">Starter</span>
                              <span className="text-xs text-muted-foreground">₹999/mo</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="flex items-center gap-1">
                                <span className="text-base font-bold">Professional</span>
                                <Star className="size-3 fill-amber-500 text-amber-500" />
                              </div>
                              <span className="text-xs text-muted-foreground">₹3,999/mo</span>
                            </div>
                          </TableHead>
                          <TableHead className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-base font-bold">Enterprise</span>
                              <span className="text-xs text-muted-foreground">Custom</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Users</TableCell>
                          <TableCell className="text-center">Up to 10</TableCell>
                          <TableCell className="text-center">Up to 50</TableCell>
                          <TableCell className="text-center">Unlimited</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Storage</TableCell>
                          <TableCell className="text-center">10 GB</TableCell>
                          <TableCell className="text-center">1 TB</TableCell>
                          <TableCell className="text-center">Unlimited</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Max File Upload</TableCell>
                          <TableCell className="text-center">10 GB</TableCell>
                          <TableCell className="text-center">Unlimited</TableCell>
                          <TableCell className="text-center">Unlimited</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Projects</TableCell>
                          <TableCell className="text-center">Limited</TableCell>
                          <TableCell className="text-center">Unlimited</TableCell>
                          <TableCell className="text-center">Unlimited</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Employee Management</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Task Management</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Time Tracking</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Attendance</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">File Management</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Team Collaboration</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Client Portal</TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Billing & Invoices</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Workflow Automation</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">RBAC</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">API Access</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Social Login</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">SSO / 2FA</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Audit Logs</TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><XIcon className="size-4 mx-auto text-muted-foreground" /></TableCell>
                          <TableCell className="text-center"><CheckIcon className="size-4 mx-auto text-green-600" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Dedicated Support</TableCell>
                          <TableCell className="text-center">Email</TableCell>
                          <TableCell className="text-center">Priority</TableCell>
                          <TableCell className="text-center">24×7</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
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

          <TabsContent value="whatsapp" className="h-full m-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-3 sm:p-4 md:p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">WhatsApp</h2>
                  <p className="text-sm text-muted-foreground">Configure WhatsApp integration for your workspace</p>
                </div>
                <WhatsAppSettings orgId={orgId} />
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sidebar Navigation</CardTitle>
        <CardDescription>Toggle visibility of sidebar navigation items across the app</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Feature</TableHead>
              <TableHead className="w-24 text-center">Visible</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {SIDEBAR_FEATURES.map((feature) => (
              <TableRow key={feature}>
                <TableCell className="font-medium">{feature}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={!hidden.includes(feature)}
                    onCheckedChange={() => handleToggle(feature)}
                    disabled={saving}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {saved && (
          <div className="flex items-center gap-1 text-sm text-green-600 mt-4">
            <CheckCircle2Icon className="size-4" /> Saved
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppSettings({ orgId }: { orgId: string }) {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [whatsappMode, setWhatsappMode] = useState<"bot" | "self-chat">("bot");
  const [allowedUsers, setAllowedUsers] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.number !== undefined) setWhatsappNumber(data.number || "");
        if (data.enabled !== undefined) setWhatsappEnabled(data.enabled);
        if (data.mode) setWhatsappMode(data.mode);
        if (data.allowedUsers) setAllowedUsers(data.allowedUsers);
        if (data.sessionActive !== undefined) setSessionActive(data.sessionActive);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/whatsapp/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: whatsappNumber,
          enabled: whatsappEnabled,
          mode: whatsappMode,
          allowedUsers,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateQr() {
    setQrLoading(true);
    try {
      const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
      const data = `https://wa.me/${cleanNumber}?text=${encodeURIComponent("Hi, I'd like to connect with your workspace.")}`;
      const url = `${QR_API}?size=300x300&data=${encodeURIComponent(data)}`;
      setQrData(data);
      setQrImageUrl(url);
    } finally {
      setQrLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>Configure your WhatsApp number for receiving messages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable WhatsApp</Label>
              <p className="text-xs text-muted-foreground">Allow users to contact this workspace via WhatsApp</p>
            </div>
            <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
          </div>

          <Separator />

          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input
              id="whatsappNumber"
              placeholder="+1234567890"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Include country code (e.g., +1 for US, +91 for India)</p>
          </div>

          <div className="grid gap-2 max-w-xs">
            <Label htmlFor="whatsappMode">Mode</Label>
            <Select value={whatsappMode} onValueChange={(v: "bot" | "self-chat") => setWhatsappMode(v)}>
              <SelectTrigger id="whatsappMode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bot">Bot (dedicated number)</SelectItem>
                <SelectItem value="self-chat">Self-chat (personal number)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Bot mode uses a dedicated business number. Self-chat uses your personal WhatsApp.
            </p>
          </div>

          <div className="grid gap-2 max-w-sm">
            <Label htmlFor="allowedUsers">Allowed Users</Label>
            <Input
              id="allowedUsers"
              placeholder="+1234567890, +1987654321"
              value={allowedUsers}
              onChange={(e) => setAllowedUsers(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Comma-separated phone numbers. Use * to allow everyone.</p>
          </div>

          {sessionActive && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2Icon className="size-4" />
              WhatsApp session is active and connected.
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <SaveIcon className="size-4 mr-1" />}
              {saving ? "Saving..." : "Save"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2Icon className="size-4" /> Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Code</CardTitle>
          <CardDescription>Generate a QR code for users to scan and contact this workspace on WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            {qrImageUrl ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={qrImageUrl}
                  alt="WhatsApp QR Code"
                  className="rounded-lg border"
                  width={300}
                  height={300}
                />
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Users can scan this QR code with their phone camera to open a WhatsApp chat with your workspace.
                </p>
              </div>
            ) : (
              <div className="flex size-[300px] items-center justify-center rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <QrCodeIcon className="size-12" />
                  <p className="text-sm">No QR code generated yet</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <Button onClick={handleGenerateQr} disabled={qrLoading || !whatsappNumber}>
              {qrLoading ? <Loader2Icon className="size-4 animate-spin mr-1" /> : <QrCodeIcon className="size-4 mr-1" />}
              {qrLoading ? "Generating..." : "Generate QR Code"}
            </Button>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
