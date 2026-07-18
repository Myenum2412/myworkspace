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
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import MuiFolderIcon from "@mui/icons-material/Folder";
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  UsersIcon,
  WorkflowIcon,
  ClockIcon,
  Settings2Icon,
  CheckCheckIcon,
  HeartHandshakeIcon,
  PackageIcon,
} from "lucide-react";
import { SIDEBAR_FEATURES } from "@/lib/sidebar-features";

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
  },
  {
    title: "Assign Tasks",
    url: "/overview",
    icon: <ListChecksIcon className="size-6" />,
  },
  {
    title: "Employees",
    url: "/employees",
    icon: <UsersIcon className="size-6" />,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: <WorkflowIcon className="size-6" />,
  },
  {
    title: "Approvals",
    url: "/approvals",
    icon: <CheckCheckIcon className="size-6" />,
  },
  {
    title: "Time Tracker",
    url: "/time-tracker",
    icon: <ClockIcon className="size-6" />,
  },
  {
    title: "File Manager",
    url: "/files",
    icon: <MuiFolderIcon className="size-6" />,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: <AttachMoneyIcon className="size-6" />,
  },
  {
    title: "Interaction Followups",
    url: "/engagement",
    icon: <HeartHandshakeIcon className="size-6" />,
  },
  {
    title: "Inventory",
    url: "/stocks",
    icon: <PackageIcon className="size-6" />,
  },
];

const photographyItem: NavItem = {
  title: "Photography",
  url: "/photography",
  icon: <CameraAltIcon className="size-6" />,
};

const settingsItem: NavItem = {
  title: "Settings",
  url: "/settings",
  icon: <Settings2Icon className="size-6" />,
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
  const [photographyInstalled, setPhotographyInstalled] = useState(false);
  const [hiddenFeatures, setHiddenFeatures] = useState<string[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/photography").then(r => r.json()).then(data => setPhotographyInstalled(data.installed)).catch(() => {}),
      fetch("/api/sidebar-features").then(r => r.json()).then(data => { if (data.hidden) setHiddenFeatures(data.hidden); }).catch(() => {}),
    ]);
  }, []);

  const visibleItems = [
    ...platformItems.filter((item) => !hiddenFeatures.includes(item.title)),
    ...(photographyInstalled && !hiddenFeatures.includes("Photography") ? [photographyItem] : []),
  ];

  const settingsItems: NavItem[] = [
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
        <NavMain items={visibleItems} label="Platform" />
        <NavMain items={settingsItems} label="Settings" className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
