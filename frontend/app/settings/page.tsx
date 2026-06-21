"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
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
} from "lucide-react";

const tabs = [
  { id: "general", label: "General", icon: Settings2Icon },
  { id: "team", label: "Team", icon: UsersIcon },
  { id: "billing", label: "Billing", icon: CreditCardIcon },
  { id: "limits", label: "Limits", icon: GaugeIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
];

export default function SettingsPage() {
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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
    fetch("/api/user/me", { credentials: "include" })
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

  function handleSave() {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 600);
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
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
                <span className="flex items-center gap-1 text-sm text-emerald-600">
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GlobeIcon className="size-4" />
                    Regional Settings
                  </CardTitle>
                  <CardDescription>Configure timezone and language preferences</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="EST">EST (UTC-5)</SelectItem>
                        <SelectItem value="PST">PST (UTC-8)</SelectItem>
                        <SelectItem value="IST">IST (UTC+5:30)</SelectItem>
                        <SelectItem value="CET">CET (UTC+1)</SelectItem>
                        <SelectItem value="AEST">AEST (UTC+10)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PaletteIcon className="size-4" />
                    Branding
                  </CardTitle>
                  <CardDescription>Customize your workspace appearance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <Label className="text-sm">Primary Color</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="size-7 rounded-full ring-offset-2 ring-offset-background"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input type="color" value="#3b82f6" className="size-7 cursor-pointer rounded border border-border p-0.5" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Dark Mode</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Switch defaultChecked />
                        <span className="text-sm text-muted-foreground">Enable dark mode</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCardIcon className="size-4" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded bg-muted flex items-center justify-center text-xs font-bold">VISA</div>
                      <div>
                        <p className="text-sm font-medium">Visa ending in 4242</p>
                        <p className="text-xs text-muted-foreground">Expires 12/27</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">Default</Badge>
                  </div>
                  <Button variant="outline" size="sm">Add Payment Method</Button>
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
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: `${(seats / memberLimit) * 100}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Active Projects</span>
                      <span className="text-xs text-muted-foreground">7 / {projectLimit}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(7 / projectLimit) * 100}%` }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Storage Limit</p>
                      <Input type="number" value={storageLimit} onChange={(e) => setStorageLimit(Number(e.target.value))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Member Limit</p>
                      <Input type="number" value={memberLimit} onChange={(e) => setMemberLimit(Number(e.target.value))} className="mt-1 h-8 text-sm" />
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Project Limit</p>
                      <Input type="number" value={projectLimit} onChange={(e) => setProjectLimit(Number(e.target.value))} className="mt-1 h-8 text-sm" />
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
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
