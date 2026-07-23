"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ROLES } from "@/lib/rbac";
import FolderIcon from "@mui/icons-material/Folder";
import {
  LayoutDashboardIcon,
  ListTodoIcon,
  ClockIcon,
  CalendarClockIcon,
  ActivityIcon,
  RotateCcwIcon,
} from "lucide-react";

function buildStaffNavData() {
  return [
    {
      title: "Dashboard",
      url: "/staffs",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
    },
    {
      title: "Task",
      url: "/staffs/tasks",
      icon: <ListTodoIcon className="size-6" />,
    },
    {
      title: "Time Sheet",
      url: "/staffs/timesheet",
      icon: <ClockIcon className="size-6" />,
    },
    {
      title: "Upcoming Tasks",
      url: "/staffs/upcoming-tasks",
      icon: <CalendarClockIcon className="size-6" />,
    },
    {
      title: "File Management",
      url: "/staffs/files",
      icon: <FolderIcon className="size-6" />,
    },
    {
      title: "Activity",
      url: "/staffs/activity",
      icon: <ActivityIcon className="size-6" />,
    },
    {
      title: "Reworks",
      url: "/staffs/reworks",
      icon: <RotateCcwIcon className="size-6" />,
    },
  ];
}

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
}

export function StaffSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUserData;
}) {
  const { data: session } = useSession();
  const currentRole = (session?.user as Record<string, unknown>)?.role as string || "";
  if (currentRole !== ROLES.STAFFS && currentRole !== ROLES.TEAM_STAFF) {
    return null;
  }
  const navItems = buildStaffNavData();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b justify-center">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <Image
            src="/logo.jpeg"
            alt="MyWorkSpace Logo"
            width={32}
            height={32}
            className="size-8 rounded-full object-cover shadow-sm shrink-0"
          />
          <h1 className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">
            Staff Panel
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} label="Navigation" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
