"use client";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  ListTodoIcon,
  UsersIcon,
  Settings2Icon,
  StoreIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";

export const defaultNavData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Reports", url: "#" },
      ],
    },
    {
      title: "Task Allocation",
      url: "/overview",
      icon: <ListTodoIcon className="size-6" />,
      items: [
        { title: "All Tasks", url: "/overview" },
        { title: "My Tasks", url: "/overview" },
        { title: "Saved Tasks", url: "/overview" },
      ],
    },
    {
      title: "Employees",
      url: "#",
      icon: <UsersIcon className="size-6" />,
      items: [
        { title: "Directory", url: "#" },
        { title: "Onboarding", url: "#" },
        { title: "Statics", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon className="size-6" />,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" },
      ],
    },
  ],
  appStore: [
    { name: "Browse Apps", url: "/appstore", icon: <StoreIcon className="size-6" /> },
  ],
};

export interface AppSidebarData {
  navMain: typeof defaultNavData.navMain;
  appStore: typeof defaultNavData.appStore;
}

export function AppSidebar({
  data = defaultNavData,
  ...props
}: React.ComponentProps<typeof Sidebar> & { data?: AppSidebarData }) {
  const { data: session } = useSession();
  const user = session?.user
    ? { name: session.user.name || "", email: session.user.email || "", avatar: session.user.image || "" }
    : { name: "User", email: "user@example.com", avatar: "" };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b justify-center">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <img
            src="/logo.jpeg"
            alt="MyWorkSpace Logo"
            className="size-8 rounded-lg object-cover shadow-sm shrink-0"
          />
          <h1 className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">
            My WorkSpace
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain.slice(0, -1)} label="Platform" />
        <NavProjects projects={data.appStore} />
        <NavMain items={data.navMain.slice(-1)} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
