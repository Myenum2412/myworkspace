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
import Link from "next/link";
import {
  Settings2Icon,
  UsersIcon,
  CreditCardIcon,
  BellIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  ListIcon,
  PlusIcon,
  Trash2Icon,
  ArrowUpRightIcon,
} from "lucide-react";
import { getDropdownOptions, saveDropdownOptions, DEFAULT_DROPDOWN_OPTIONS } from "@/lib/dropdown-options";

const tabs = [
  { id: "general", label: "General", icon: Settings2Icon },
  { id: "team", label: "Team", icon: UsersIcon },
  { id: "billing", label: "Billing", icon: CreditCardIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "employee-fields", label: "Employee Fields", icon: ListIcon },
];

export type SettingsPageClientProps = {
  orgId: string;
  user: { name: string; email: string; avatar: string };
  initialSettings: {
    general?: { orgName?: string; orgSlug?: string; timezone?: string; language?: string };
    team?: { defaultTeamRole?: string; allowSelfAssign?: boolean; maxTeamSize?: number; autoAssignLead?: boolean };
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
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  return null;
}
