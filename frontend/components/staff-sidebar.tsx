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
  UsersIcon,
  LayoutDashboardIcon,
  CalendarIcon,
  ClockIcon,
  ClipboardListIcon,
  Settings2Icon,
} from "lucide-react";

export const defaultStaffNavData = [
  {
    title: "Overview",
    url: "/staffs",
    icon: <LayoutDashboardIcon className="size-6" />,
    isActive: true,
    items: [
      { title: "Dashboard", url: "/staffs" },
      { title: "Activity", url: "/staffs/activity" },
    ],
  },
  {
    title: "All Staffs",
    url: "/staffs/list",
    icon: <UsersIcon className="size-6" />,
    items: [
      { title: "Directory", url: "/staffs/list" },
      { title: "Add Staff", url: "/staffs/add" },
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
    title: "Settings",
    url: "/staffs/settings",
    icon: <Settings2Icon className="size-6" />,
    items: [
      { title: "General", url: "/staffs/settings" },
      { title: "Roles", url: "/staffs/settings/roles" },
    ],
  },
];

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
}

export function StaffSidebar({
  user,
  navItems = defaultStaffNavData,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  navItems?: typeof defaultStaffNavData;
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
            Staff Panel
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems.slice(0, -1)} label="Staff Management" />
        <NavMain items={navItems.slice(-1)} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
