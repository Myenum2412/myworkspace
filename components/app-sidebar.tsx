"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GalleryVerticalEndIcon, AudioLinesIcon, TerminalIcon, TerminalSquareIcon, BotIcon, BookOpenIcon, Settings2Icon, FrameIcon, PieChartIcon, MapIcon, LayoutDashboardIcon, ListTodoIcon, UsersIcon, StoreIcon } from "lucide-react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "Acme Inc",
      logo: <GalleryVerticalEndIcon className="size-6" />,
      plan: "Enterprise",
    },
    {
      name: "Acme Corp.",
      logo: <AudioLinesIcon className="size-6" />,
      plan: "Startup",
    },
    {
      name: "Evil Corp.",
      logo: <TerminalIcon className="size-6" />,
      plan: "Free",
    },
  ],
  navMain: [
    {
      title: "Dashboard",
      url: "#",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
      items: [
        { title: "Overview", url: "#" },
        { title: "Reports", url: "#" },
      ],
    },
    {
      title: "Task Allocation",
      url: "/overview",
      icon: <ListTodoIcon className="size-6" />,
      items: [
        { title: "All Tasks", url: "#" },
        { title: "My Tasks", url: "#" },
        { title: "Saved Tasks", url: "#" },
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
    {
      name: "Browse Apps",
      url: "/appstore",
      icon: <StoreIcon className="size-6" />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b justify-center">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <img src="/logo.jpeg" alt="MyWorkSpace Logo" className="size-8 rounded-lg object-cover shadow-sm shrink-0" />
          <h1 className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">My WorkSpace</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain.slice(0, -1)} label="Platform" />
        <NavProjects projects={data.appStore} />
        <NavMain items={data.navMain.slice(-1)} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
