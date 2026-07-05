"use client";

import Image from "next/image";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Building2Icon,
  LayoutDashboardIcon,
  UsersIcon,
  Settings2Icon,
  ShieldIcon,
  ClipboardListIcon,
  BarChart3Icon,
  FolderIcon,
} from "lucide-react";

export const defaultOrgNavData = [
  {
    title: "Dashboard",
    url: "/orgmenu",
    icon: <LayoutDashboardIcon className="size-6" />,
    isActive: true,
    items: [
      { title: "Overview", url: "/orgmenu" },
      { title: "Analytics", url: "/orgmenu/analytics" },
    ],
  },
  {
    title: "Organization",
    url: "/orgmenu/org",
    icon: <Building2Icon className="size-6" />,
    items: [
      { title: "Details", url: "/orgmenu/org" },
      { title: "Billing", url: "/orgmenu/org/billing" },
      { title: "Plans", url: "/orgmenu/org/plans" },
    ],
  },
  {
    title: "Members",
    url: "/orgmenu/members",
    icon: <UsersIcon className="size-6" />,
    items: [
      { title: "All Members", url: "/orgmenu/members" },
      { title: "Invite", url: "/orgmenu/members/invite" },
      { title: "Roles", url: "/orgmenu/members/roles" },
    ],
  },
  {
    title: "Audit Logs",
    url: "/orgmenu/audit",
    icon: <ClipboardListIcon className="size-6" />,
    items: [
      { title: "All Logs", url: "/orgmenu/audit" },
      { title: "Exports", url: "/orgmenu/audit/exports" },
    ],
  },
  {
    title: "Reports",
    url: "/orgmenu/reports",
    icon: <BarChart3Icon className="size-6" />,
    items: [
      { title: "Usage", url: "/orgmenu/reports/usage" },
      { title: "Activity", url: "/orgmenu/reports/activity" },
    ],
  },
  {
    title: "Security",
    url: "/orgmenu/security",
    icon: <ShieldIcon className="size-6" />,
    items: [
      { title: "Policies", url: "/orgmenu/security/policies" },
      { title: "SSO", url: "/orgmenu/security/sso" },

    ],
  },
  {
    title: "File Manager",
    url: "/orgmenu/files",
    icon: <FolderIcon className="size-6" />,
    items: [
      { title: "All Files", url: "/orgmenu/files" },
    ],
  },
  {
    title: "Settings",
    url: "/orgmenu/settings",
    icon: <Settings2Icon className="size-6" />,
    items: [
      { title: "General", url: "/orgmenu/settings" },
      { title: "Notifications", url: "/orgmenu/settings/notifications" },
    ],
  },
];

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
  role?: string;
  permissions?: string[];
}

export function OrgSidebar({
  user,
  navItems = defaultOrgNavData,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems?: typeof defaultOrgNavData;
  user: NavUserData;
}) {

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b justify-center">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <Image
            src="/logo.jpeg"
            alt="MyWorkSpace Logo"
            width={32}
            height={32}
            className="size-8 rounded-lg object-cover shadow-sm shrink-0"
          />
          <h1 className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">
            Origin Menu
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems.slice(0, -1)} label="Platform" />
        <NavMain items={navItems.slice(-1)} label="Configuration" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
