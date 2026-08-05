"use client";

import { useSession } from "next-auth/react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { SidebarBrand } from "@/components/sidebar-brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ROLES } from "@/lib/rbac";
import { useIndustry } from "@/components/industry-provider";
import FolderIcon from "@mui/icons-material/Folder";
import {
  LayoutDashboardIcon,
  ListTodoIcon,
  ClockIcon,
  CalendarClockIcon,
  ActivityIcon,
  RotateCcwIcon,
  FolderKanbanIcon,
  SendIcon,
} from "lucide-react";

function buildStaffNavData(t: (key: any) => string) {
  return [
    { title: t("nav.dashboard"), url: "/staffs", icon: <LayoutDashboardIcon className="size-6" />, isActive: true },
    { title: t("nav.staffTasks"), url: "/staffs/tasks", icon: <ListTodoIcon className="size-6" /> },
    { title: t("nav.projects"), url: "/staffs/projects", icon: <FolderKanbanIcon className="size-6" /> },
    { title: t("nav.staffTimesheet"), url: "/staffs/timesheet", icon: <ClockIcon className="size-6" /> },
    { title: t("nav.staffUpcomingTasks"), url: "/staffs/upcoming-tasks", icon: <CalendarClockIcon className="size-6" /> },
    { title: t("nav.fileManager"), url: "/staffs/files", icon: <FolderIcon className="size-6" /> },
    { title: t("nav.staffActivity"), url: "/staffs/activity", icon: <ActivityIcon className="size-6" /> },
    { title: t("nav.reworks"), url: "/staffs/reworks", icon: <RotateCcwIcon className="size-6" /> },
    { title: "Submissions", url: "/staffs/submissions", icon: <SendIcon className="size-6" /> },
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
  const { t } = useIndustry();
  const currentRole = (session?.user as Record<string, unknown>)?.role as string || "";
  if (currentRole !== ROLES.STAFFS && currentRole !== ROLES.TEAM_STAFF) {
    return null;
  }
  const navItems = buildStaffNavData(t);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrand title={t("app.name")} subtitle="Staff Panel" />
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
