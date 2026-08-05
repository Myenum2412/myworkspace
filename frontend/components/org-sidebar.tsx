"use client";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarBrand } from "@/components/sidebar-brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ROLES, isAdminRole } from "@/lib/rbac";
import {
  Building2Icon,
  LayoutDashboardIcon,
  UsersIcon,
  Settings2Icon,
  ShieldIcon,
  ClipboardListIcon,
  BrainIcon,
  WorkflowIcon,
  Code2Icon,
  PuzzleIcon,
  ActivityIcon,
  StarIcon,
  CreditCardIcon,
} from "lucide-react";

export const defaultOrgNavData = [
  {
    title: "Dashboard",
    url: "/orgmenu",
    icon: <LayoutDashboardIcon className="size-6" />,
    isActive: true,
  },
  {
    title: "Organization",
    url: "/orgmenu/org",
    icon: <Building2Icon className="size-6" />,
  },
  {
    title: "Members",
    url: "/orgmenu/members",
    icon: <UsersIcon className="size-6" />,
  },
  {
    title: "Audit Logs",
    url: "/orgmenu/audit",
    icon: <ClipboardListIcon className="size-6" />,
  },
  {
    title: "Security",
    url: "/orgmenu/security",
    icon: <ShieldIcon className="size-6" />,
  },
  {
    title: "Plans",
    url: "/orgmenu/plans",
    icon: <CreditCardIcon className="size-6" />,
  },
  {
    title: "Settings",
    url: "/orgmenu/settings",
    icon: <Settings2Icon className="size-6" />,
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
  if (!isAdminRole(user.role || "")) {
    return null;
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrand title="Origin Menu" />
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
