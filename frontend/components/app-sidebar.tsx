"use client";

"use client";

import { useEffect, useState } from "react";
import { useIndustry } from "@/components/industry-provider";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarBrand } from "@/components/sidebar-brand";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import {
  AttachMoneyIcon,
  BarChart3Icon,
  CameraAltIcon,
  CheckCheckIcon,
  ClockIcon,
  HeartHandshakeIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  MuiFolderIcon,
  PackageIcon,
  RotateCcwIcon,
  SendIcon,
  Settings2Icon,
  UsersIcon,
  WorkflowIcon,
} from "@/lib/icons";
import type { TermKey } from "@/lib/industry-terms";
import { isAdminRole, ROLES } from "@/lib/rbac";
import { canAccessPath, filterNavByRole } from "@/lib/rbac/navigation";
import { SIDEBAR_FEATURES } from "@/lib/sidebar-features";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
  role?: string;
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: NavUserData }) {
  const { t } = useIndustry();
  const [photographyInstalled, setPhotographyInstalled] = useState(false);
  const [hiddenFeatures, setHiddenFeatures] = useState<string[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/photography")
        .then((r) => r.json())
        .then((data) => setPhotographyInstalled(data.installed))
        .catch(() => {}),
      fetch("/api/sidebar-features")
        .then((r) => r.json())
        .then((data) => {
          if (data.hidden) setHiddenFeatures(data.hidden);
        })
        .catch(() => {}),
    ]);
  }, []);

  const platformItems: NavItem[] = [
    {
      title: t("nav.dashboard"),
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
    },
    { title: t("nav.overview"), url: "/overview", icon: <ListChecksIcon className="size-6" /> },
    { title: t("nav.employees"), url: "/employees", icon: <UsersIcon className="size-6" /> },
    { title: t("nav.projects"), url: "/projects", icon: <WorkflowIcon className="size-6" /> },
    { title: t("nav.approvals"), url: "/approvals", icon: <CheckCheckIcon className="size-6" /> },
    { title: t("nav.timeTracker"), url: "/time-tracker", icon: <ClockIcon className="size-6" /> },
    { title: t("nav.fileManager"), url: "/files", icon: <MuiFolderIcon className="size-6" /> },
    { title: t("nav.billing"), url: "/billing", icon: <AttachMoneyIcon className="size-6" /> },
    {
      title: t("nav.engagement"),
      url: "/engagement",
      icon: <HeartHandshakeIcon className="size-6" />,
    },
    { title: t("nav.inventory"), url: "/stocks", icon: <PackageIcon className="size-6" /> },
    { title: t("nav.reworks"), url: "/reworks", icon: <RotateCcwIcon className="size-6" /> },
    { title: t("nav.submissions"), url: "/submissions", icon: <SendIcon className="size-6" /> },
    {
      title: t("nav.reports"),
      url: "/dashboard/reports",
      icon: <BarChart3Icon className="size-6" />,
    },
  ];

  const photographyItem: NavItem = {
    title: t("nav.photography"),
    url: "/photography",
    icon: <CameraAltIcon className="size-6" />,
  };

  const settingsItem: NavItem = {
    title: t("nav.settings"),
    url: "/settings",
    icon: <Settings2Icon className="size-6" />,
  };

  const role = user.role || "";
  const roleFilteredItems = filterNavByRole(platformItems, role);

  const visibleItems = [
    ...roleFilteredItems.filter((item) => !hiddenFeatures.includes(item.title)),
    ...(photographyInstalled && !hiddenFeatures.includes(t("nav.photography"))
      ? [photographyItem]
      : []),
  ];

  const settingsItems: NavItem[] = [settingsItem];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrand title={t("app.name")} />
      <SidebarContent>
        <NavMain items={visibleItems} label={t("nav.dashboard")} />
        <NavMain items={settingsItems} label={t("nav.settings")} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
