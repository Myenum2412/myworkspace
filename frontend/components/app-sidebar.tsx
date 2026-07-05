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
  LayoutDashboardIcon,
  ListChecksIcon,
  UsersIcon,
  WorkflowIcon,
  ClockIcon,
  FolderIcon,
  Settings2Icon,
  CheckCheckIcon,
  CreditCardIcon,
  BriefcaseIcon,
} from "lucide-react";

export const defaultNavData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Reports", url: "/reports" },
      ],
    },
    {
      title: "Task Allocation",
      url: "/overview",
      icon: <ListChecksIcon className="size-6" />,
      items: [
        { title: "Team Tasks", url: "/teamtasks" },
        { title: "All Tasks", url: "/alltasks" },
        { title: "My Tasks", url: "/mytasks" },
        { title: "Saved Tasks", url: "/savedtasks" },
        { title: "Upcoming Tasks", url: "/upcomingtasks" },
      ],
    },
    {
      title: "Employees",
      url: "/employees",
      icon: <UsersIcon className="size-6" />,
      items: [
        { title: "All Employees", url: "/employees" },
        { title: "Teams", url: "/teams" },
        { title: "Terminated", url: "/terminated" },
      ],
    },
    {
      title: "Attendance",
      url: "/attendance",
      icon: <BriefcaseIcon className="size-6" />,
      items: [
        { title: "Overview", url: "/attendance" },
        { title: "Reports", url: "/attendance/reports" },
      ],
    },
    {
      title: "Projects",
      url: "/projects",
      icon: <WorkflowIcon className="size-6" />,
      items: [
        { title: "Clients", url: "/clients" },
        { title: "All Projects", url: "/projects" },
      ],
    },
    {
      title: "Approvals",
      url: "/approvals",
      icon: <CheckCheckIcon className="size-6" />,
      items: [
        { title: "Pending", url: "/approvals" },
        { title: "Approved", url: "/approvals/approved" },
        { title: "Rejected", url: "/approvals/rejected" },
      ],
    },
    {
      title: "Time Tracker",
      url: "/time-tracker",
      icon: <ClockIcon className="size-6" />,
      items: [
        { title: "My Time", url: "/my-time" },
        { title: "Team Time", url: "/team-time" },
        { title: "Time Reports", url: "/time-reports" },
      ],
    },
    {
      title: "File Manager",
      url: "/files",
      icon: <FolderIcon className="size-6" />,
      items: [
        { title: "All Files", url: "/files" },
        { title: "Upload", url: "/files?upload=true" },
        { title: "Recycle Bin", url: "/recycle-bin" },
        { title: "Audit Log", url: "/files/audit" },
      ],
    },
    {
      title: "Billing",
      url: "/billing",
      icon: <CreditCardIcon className="size-6" />,
      items: [
        { title: "Overview", url: "/billing" },
        { title: "Plans", url: "/billing/plans" },
        { title: "Invoices", url: "/billing/invoices" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings2Icon className="size-6" />,
      items: [
        { title: "General", url: "/settings" },
        { title: "Plans & Billing", url: "/settings/plans" },
      ],
    },
  ],
};

export interface AppSidebarData {
  navMain: typeof defaultNavData.navMain;
}

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
  role?: string;
}

export function AppSidebar({
  user,
  data = defaultNavData,
  ...props
}: React.ComponentProps<typeof Sidebar> & { data?: AppSidebarData; user: NavUserData }) {

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
            My WorkSpace
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain.slice(0, -1)} label="Platform" />
        <NavMain items={data.navMain.slice(-1)} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
