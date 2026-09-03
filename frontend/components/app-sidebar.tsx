"use client";

import { useEffect, useState } from "react";
import { useIndustry } from "@/components/industry-provider";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarBrand } from "@/components/sidebar-brand";
import { SvglIcon } from "@/components/svgl-icon";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import { Settings2Icon } from "@/lib/icons";
import { filterNavByRole } from "@/lib/rbac/navigation";

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
      icon: <SvglIcon name="linear" className="size-6" alt="dashboard" />,
      isActive: true,
    },
    {
      title: t("nav.overview"),
      url: "/overview",
      icon: <SvglIcon name="asana" className="size-6" alt="overview" />,
    },
    {
      title: t("nav.employees"),
      url: "/employees",
      icon: <SvglIcon name="slack" className="size-6" alt="employees" />,
    },
    {
      title: t("nav.projects"),
      url: "/projects",
      icon: <SvglIcon name="notion" className="size-6" alt="projects" />,
    },
    {
      title: t("nav.approvals"),
      url: "/approvals",
      icon: <SvglIcon name="clickup" className="size-6" alt="approvals" />,
    },
    {
      title: t("nav.fileManager"),
      url: "/files",
      icon: <SvglIcon name="google_drive" className="size-6" alt="files" />,
    },
    {
      title: t("nav.billing"),
      url: "/billing",
      icon: <SvglIcon name="stripe" className="size-6" alt="billing" />,
    },
    {
      title: t("nav.chatting"),
      url: "/chat",
      icon: <SvglIcon name="slack" className="size-6" alt="chat" />,
    },
    {
      title: t("nav.reports"),
      url: "/dashboard/reports",
      icon: <SvglIcon name="vercel" className="size-6" alt="reports" />,
    },
  ];

  const photographyItem: NavItem = {
    title: t("nav.photography"),
    url: "/photography",
    icon: <SvglIcon name="figma" className="size-6" alt="photography" />,
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
      <SidebarBrand title="" />
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
