"use client";

import { useState, useEffect } from "react";
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
import MuiFolderIcon from "@mui/icons-material/Folder";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ChatIcon from "@mui/icons-material/Chat";
import CategoryIcon from "@mui/icons-material/Category";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  UsersIcon,
  WorkflowIcon,
  ClockIcon,
  Settings2Icon,
  CheckCheckIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

const platformItems: NavItem[] = [
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
      { title: "Attendance Overview", url: "/attendance" },
      { title: "Attendance Reports", url: "/attendance/reports" },
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
    icon: <MuiFolderIcon className="size-6" />,
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
    icon: <AttachMoneyIcon className="size-6" />,
    items: [
      { title: "Overview", url: "/billing" },
      { title: "Services", url: "/billing/services" },
      { title: "Invoices", url: "/billing/invoices" },
      { title: "Receipt", url: "/billing/receipts" },
    ],
  },
  {
    title: "Chat",
    url: "/chat",
    icon: <ChatIcon className="size-6" />,
  },
];

const categoryItem: NavItem = {
  title: "Category",
  url: "/category",
  icon: <CategoryIcon className="size-6" />,
};

const doctorKitItem: NavItem = {
  title: "Doctor Kit",
  url: "/appointments",
  icon: <LocalHospitalIcon className="size-6" />,
  items: [
    { title: "Booking Appointments", url: "/appointments" },
  ],
};

const settingsItem: NavItem = {
  title: "Settings",
  url: "/settings",
  icon: <Settings2Icon className="size-6" />,
  items: [
    { title: "General", url: "/settings" },
    { title: "Billing", url: "/settings" },
  ],
};

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
  const [doctorKitInstalled, setDoctorKitInstalled] = useState(false);

  useEffect(() => {
    fetch("/api/doctor-kit")
      .then((r) => r.json())
      .then((data) => setDoctorKitInstalled(data.installed))
      .catch(() => {});
  }, []);

  const settingsItems: NavItem[] = [
    categoryItem,
    ...(doctorKitInstalled ? [doctorKitItem] : []),
    settingsItem,
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
            My WorkSpace
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={platformItems} label="Platform" />
        <NavMain items={settingsItems} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
