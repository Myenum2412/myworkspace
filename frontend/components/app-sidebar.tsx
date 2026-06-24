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
  CalendarIcon,
  ClipboardListIcon,
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
        { title: "Shared with Me", url: "/shared" },
        { title: "Recycle Bin", url: "/recycle-bin" },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings2Icon className="size-6" />,
      items: [
        { title: "General", url: "/settings" },
        { title: "Team", url: "/settings" },
        { title: "Billing", url: "/settings" },
        { title: "Limits", url: "/settings" },
        { title: "Notifications", url: "/settings" },
      ],
    },
  ],
};

export interface AppSidebarData {
  navMain: typeof defaultNavData.navMain;
}

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "developer@myenum.in").toLowerCase().trim();

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

  const isEmployee = user.role === "member";

  const employeeNav = [
    {
      title: "Dashboard",
      url: "/staffs",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
      items: [
        { title: "Overview", url: "/staffs" },
        { title: "Activity", url: "/staffs/activity" },
      ],
    },
    {
      title: "My Tasks",
      url: "/mytasks",
      icon: <ListChecksIcon className="size-6" />,
      items: [
        { title: "All Tasks", url: "/alltasks" },
        { title: "My Tasks", url: "/mytasks" },
        { title: "Upcoming", url: "/upcomingtasks" },
      ],
    },
    {
      title: "Schedule",
      url: "/staffs/schedule",
      icon: <CalendarIcon className="size-6" />,
      items: [
        { title: "Shifts", url: "/staffs/schedule" },
        { title: "Time Off", url: "/staffs/time-off" },
      ],
    },
    {
      title: "Attendance",
      url: "/staffs/attendance",
      icon: <ClockIcon className="size-6" />,
      items: [
        { title: "Today", url: "/staffs/attendance" },
        { title: "Reports", url: "/staffs/attendance/reports" },
      ],
    },
    {
      title: "Performance",
      url: "/staffs/performance",
      icon: <ClipboardListIcon className="size-6" />,
      items: [
        { title: "Reviews", url: "/staffs/performance" },
        { title: "Goals", url: "/staffs/performance/goals" },
      ],
    },
    {
      title: "File Manager",
      url: "/files",
      icon: <FolderIcon className="size-6" />,
      items: [
        { title: "All Files", url: "/files" },
      ],
    },
    {
      title: "Settings",
      url: "/staffs/settings",
      icon: <Settings2Icon className="size-6" />,
      items: [
        { title: "General", url: "/staffs/settings" },
      ],
    },
  ];

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
            {isEmployee ? "Staff Panel" : "My WorkSpace"}
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isEmployee ? (
          <>
            <NavMain items={employeeNav.slice(0, -1)} label="Staff" />
            <NavMain items={employeeNav.slice(-1)} label="Settings" className="mt-auto" />
          </>
        ) : (
          <>
            <NavMain items={data.navMain.slice(0, -1)} label="Platform" />
            <NavMain items={data.navMain.slice(-1)} label="Settings" className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
