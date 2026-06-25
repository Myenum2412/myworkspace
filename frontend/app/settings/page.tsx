"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Settings2Icon,
  UsersIcon,
  CreditCardIcon,
  GaugeIcon,
  BellIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  GlobeIcon,
  ClockIcon,
  PaletteIcon,
  ShieldIcon,
  ListIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { getDropdownOptions, saveDropdownOptions, DEFAULT_DROPDOWN_OPTIONS } from "@/lib/dropdown-options";

const tabs = [
  { id: "general", label: "General", icon: Settings2Icon },
  { id: "team", label: "Team", icon: UsersIcon },
  { id: "billing", label: "Billing", icon: CreditCardIcon },
  { id: "limits", label: "Limits", icon: GaugeIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "employee-fields", label: "Employee Fields", icon: ListIcon },
];

export default function SettingsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [orgId, setOrgId] = useState("");

  // General
  const [orgName, setOrgName] = useState("My WorkSpace");
  const [orgSlug, setOrgSlug] = useState("myworkspace");
  const [timezone, setTimezone] = useState("UTC");
  const [language, setLanguage] = useState("en");

  // Team
  const [defaultTeamRole, setDefaultTeamRole] = useState("member");
  const [allowSelfAssign, setAllowSelfAssign] = useState(true);
  const [maxTeamSize, setMaxTeamSize] = useState("20");
  const [autoAssignLead, setAutoAssignLead] = useState(false);

  // Billing
  const [plan, setPlan] = useState("Starter");
  const [nextBilling, setNextBilling] = useState("2026-07-21");
  const [seats, setSeats] = useState(5);

  // Limits
  const [storageUsed, setStorageUsed] = useState(2.4);
  const [storageLimit, setStorageLimit] = useState(10);
  const [memberLimit, setMemberLimit] = useState(25);
  const [projectLimit, setProjectLimit] = useState(10);

  // Employee Fields
  const [dropdownOptions, setDropdownOptionsState] = useState<Record<string, string[]>>(DEFAULT_DROPDOWN_OPTIONS);
  const [newOptionInputs, setNewOptionInputs] = useState<Record<string, string>>({});
  const [editingOption, setEditingOption] = useState<{ field: string; index: number; value: string } | null>(null);
  const editingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDropdownOptionsState(getDropdownOptions());
  }, []);

  useEffect(() => {
    if (editingOption && editingInputRef.current) {
      editingInputRef.current.focus();
      editingInputRef.current.setSelectionRange(editingInputRef.current.value.length, editingInputRef.current.value.length);
    }
  }, [editingOption]);

  const persistOptions = (options: Record<string, string[]>) => {
    saveDropdownOptions(options);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addOption = (field: string) => {
    const value = newOptionInputs[field]?.trim();
    if (!value) return;
    const updated = {
      ...dropdownOptions,
      [field]: [...(dropdownOptions[field] || []), value],
    };
    setDropdownOptionsState(updated);
    persistOptions(updated);
    setNewOptionInputs((prev) => ({ ...prev, [field]: "" }));
  };

  const removeOption = (field: string, index: number) => {
    const updated = {
      ...dropdownOptions,
      [field]: (dropdownOptions[field] || []).filter((_: string, i: number) => i !== index),
    };
    setDropdownOptionsState(updated);
    persistOptions(updated);
  };

  const startEditing = (field: string, index: number, currentValue: string) => {
    setEditingOption({ field, index, value: currentValue });
  };

  const saveEditing = () => {
    if (!editingOption) return;
    const trimmed = editingOption.value.trim();
    if (!trimmed) {
      setEditingOption(null);
      return;
    }
    const arr = [...(dropdownOptions[editingOption.field] || [])];
    arr[editingOption.index] = trimmed;
    const updated = { ...dropdownOptions, [editingOption.field]: arr };
    setDropdownOptionsState(updated);
    persistOptions(updated);
    setEditingOption(null);
  };

  const cancelEditing = () => setEditingOption(null);

  // Notifications
  const [notifSettings, setNotifSettings] = useState({
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
  });

  useEffect(() => {
    fetch("/api/user/profile", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => {
        setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" });
        const id = u.org?.id || u.org?._id?.toString() || "";
        if (id) {
          setOrgId(id);
          fetch(`/api/settings?orgId=${id}`, { credentials: "include" })
            .then((r) => r.json())
            .then((d) => {
              const s = d.data;
              if (!s) return;
              if (s.general) {
                if (s.general.orgName) setOrgName(s.general.orgName);
                if (s.general.orgSlug) setOrgSlug(s.general.orgSlug);
                if (s.general.timezone) setTimezone(s.general.timezone);
                if (s.general.language) setLanguage(s.general.language);
              }
              if (s.team) {
                if (s.team.defaultTeamRole) setDefaultTeamRole(s.team.defaultTeamRole);
                if (s.team.allowSelfAssign !== undefined) setAllowSelfAssign(s.team.allowSelfAssign);
                if (s.team.maxTeamSize) setMaxTeamSize(String(s.team.maxTeamSize));
                if (s.team.autoAssignLead !== undefined) setAutoAssignLead(s.team.autoAssignLead);
              }
              if (s.notifications) setNotifSettings(s.notifications);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          general: { orgName, orgSlug, timezone, language },
          team: { defaultTeamRole, allowSelfAssign, maxTeamSize: Number(maxTeamSize), autoAssignLead },
          notifications: notifSettings,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {}
    setSaving(false);
  }

  return (
                                <main className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings2Icon className="size-6 text-muted-foreground" />
              <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your organization preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="flex items-center gap-1 text-sm text-red-400">
                  <CheckCircle2Icon className="size-4" />
                  Saved
                </span>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2Icon className="size-4 animate-spin mr-2" /> : <SaveIcon className="size-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* General */}
          {activeTab === "general" && (
            <div className="space-y-4">
            </div>
          )}

          {/* Team */}
          {activeTab === "team" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UsersIcon className="size-4" />
                    Team Defaults
                  </CardTitle>
                  <CardDescription>Default settings for new teams</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">Default Member Role</Label>
                      <Select value={defaultTeamRole} onValueChange={setDefaultTeamRole}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm">Max Team Size</Label>
                      <Input type="number" value={maxTeamSize} onChange={(e) => setMaxTeamSize(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Self Assignment</p>
                        <p className="text-xs text-muted-foreground">Allow members to assign themselves to tasks</p>
                      </div>
                      <Switch checked={allowSelfAssign} onCheckedChange={setAllowSelfAssign} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto Assign Lead</p>
                        <p className="text-xs text-muted-foreground">Automatically assign a team lead when creating a team</p>
                      </div>
                      <Switch checked={autoAssignLead} onCheckedChange={setAutoAssignLead} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Billing */}
          {activeTab === "billing" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCardIcon className="size-4" />
                    Current Plan
                  </CardTitle>
                  <CardDescription>Your subscription and billing details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{plan} Plan</p>
                      <p className="text-xs text-muted-foreground">{seats} seats · Next billing: {nextBilling}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex gap-3">
                    {["Starter", "Professional", "Enterprise"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlan(p)}
                        className={`flex-1 rounded-lg border p-3 text-left transition-colors ${
                          plan === p ? "border-primary bg-primary/5" : "hover:bg-muted"
                        }`}
                      >
                        <p className="text-sm font-medium">{p}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p === "Starter" ? "Free" : p === "Professional" ? "$29/mo" : "$99/mo"}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* Limits */}
          {activeTab === "limits" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GaugeIcon className="size-4" />
                    Usage Limits
                  </CardTitle>
                  <CardDescription>Monitor and manage your resource usage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Storage</span>
                      <span className="text-xs text-muted-foreground">{storageUsed} GB / {storageLimit} GB</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(storageUsed / storageLimit) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Team Members</span>
                      <span className="text-xs text-muted-foreground">{seats} / {memberLimit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-red-500" style={{ width: `${(seats / memberLimit) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Active Projects</span>
                      <span className="text-xs text-muted-foreground">7 / {projectLimit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-red-500" style={{ width: `${(7 / projectLimit) * 100}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications */}
          {activeTab === "notifications" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BellIcon className="size-4" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Configure email, push, and in-app notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <ShieldIcon className="size-3.5 text-muted-foreground" />
                      Task Updates
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: "taskAssigned", label: "Task assigned to me" },
                        { key: "taskStatusChange", label: "Task status changes" },
                        { key: "taskComments", label: "Task comments" },
                        { key: "dueDateReminders", label: "Due date reminders" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Switch
                            checked={notifSettings[item.key as keyof typeof notifSettings]}
                            onCheckedChange={(v) => setNotifSettings((prev) => ({ ...prev, [item.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <UsersIcon className="size-3.5 text-muted-foreground" />
                      Team Activity
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: "memberJoinLeave", label: "Member joins or leaves" },
                        { key: "teamMentions", label: "Team mentions" },
                        { key: "projectUpdates", label: "Project updates" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Switch
                            checked={notifSettings[item.key as keyof typeof notifSettings]}
                            onCheckedChange={(v) => setNotifSettings((prev) => ({ ...prev, [item.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Settings2Icon className="size-3.5 text-muted-foreground" />
                      System
                    </h3>
                    <div className="space-y-3">
                      {[
                        { key: "securityAlerts", label: "Security alerts" },
                        { key: "billingUpdates", label: "Billing updates" },
                        { key: "featureAnnouncements", label: "Feature announcements" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <span className="text-sm">{item.label}</span>
                          <Switch
                            checked={notifSettings[item.key as keyof typeof notifSettings]}
                            onCheckedChange={(v) => setNotifSettings((prev) => ({ ...prev, [item.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Fields */}
          {activeTab === "employee-fields" && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListIcon className="size-4" />
                    Employee Field Options
                  </CardTitle>
                  <CardDescription>
                    Manage dropdown options used in the Add Employee form. Changes are saved automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[
                    { key: "departments", label: "Departments" },
                    { key: "locations", label: "Locations" },
                    { key: "designations", label: "Designations" },
                    { key: "employmentTypes", label: "Employment Types" },
                    { key: "statuses", label: "Statuses" },
                    { key: "branches", label: "Branches" },
                    { key: "shifts", label: "Shifts" },
                    { key: "sourceOfHires", label: "Source of Hire" },
                    { key: "countries", label: "Countries" },
                  ].map((field) => (
                    <div key={field.key} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold">{field.label}</h3>
                        <span className="text-xs text-muted-foreground">
                          {(dropdownOptions[field.key] || []).length} options
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {(dropdownOptions[field.key] || []).map((opt: string, idx: number) =>
                          editingOption?.field === field.key && editingOption.index === idx ? (
                            <div key={idx} className="flex gap-1 items-center">
                              <Input
                                ref={editingInputRef}
                                value={editingOption.value}
                                onChange={(e) =>
                                  setEditingOption((prev) => prev ? { ...prev, value: e.target.value } : null)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); saveEditing(); }
                                  if (e.key === "Escape") { e.preventDefault(); cancelEditing(); }
                                }}
                                onBlur={saveEditing}
                                className="h-7 w-40 text-sm"
                              />
                            </div>
                          ) : (
                            <Badge key={idx} variant="secondary" className="gap-1 pr-1 cursor-pointer">
                              <span
                                onClick={() => startEditing(field.key, idx, opt)}
                                className="hover:underline"
                              >
                                {opt}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeOption(field.key, idx)}
                                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                              >
                                <Trash2Icon className="size-3" />
                              </button>
                            </Badge>
                          )
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={`Add ${field.label.toLowerCase()}`}
                          value={newOptionInputs[field.key] || ""}
                          onChange={(e) =>
                            setNewOptionInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); addOption(field.key); }
                          }}
                          className="h-8 text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => addOption(field.key)}
                          disabled={!newOptionInputs[field.key]?.trim()}
                        >
                          <PlusIcon className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </main>
            );
}
