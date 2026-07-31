"use client";

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
  RotateCcwIcon,
  BarChart3Icon,
  SendIcon,
  SquarePlusIcon,
} from "lucide-react";
import { useIndustry } from "@/components/industry-provider";

const AddonsIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.39 48.39 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
  </svg>
);
import { ROLES, isAdminRole } from "@/lib/rbac";
import { SIDEBAR_FEATURES } from "@/lib/sidebar-features";
import { canAccessPath, filterNavByRole } from "@/lib/rbac/navigation";
import type { TermKey } from "@/lib/industry-terms";

export interface NavItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  isActive?: boolean;
  items?: { title: string; url: string }[];
}

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
  const { t } = useIndustry();
  const [photographyInstalled, setPhotographyInstalled] = useState(false);
  const [hiddenFeatures, setHiddenFeatures] = useState<string[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/photography").then(r => r.json()).then(data => setPhotographyInstalled(data.installed)).catch(() => { }),
      fetch("/api/sidebar-features").then(r => r.json()).then(data => { if (data.hidden) setHiddenFeatures(data.hidden); }).catch(() => { }),
    ]);
  }, []);

  const platformItems: NavItem[] = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: <LayoutDashboardIcon className="size-6" />, isActive: true },
    { title: t("nav.overview"), url: "/overview", icon: <ListChecksIcon className="size-6" /> },
    { title: t("nav.createTask"), url: "/createtask", icon: <SquarePlusIcon className="size-6" /> },
    { title: t("nav.employees"), url: "/employees", icon: <UsersIcon className="size-6" /> },
    { title: t("nav.projects"), url: "/projects", icon: <WorkflowIcon className="size-6" /> },
    { title: t("nav.approvals"), url: "/approvals", icon: <CheckCheckIcon className="size-6" /> },
    { title: t("nav.timeTracker"), url: "/time-tracker", icon: <ClockIcon className="size-6" /> },
    { title: t("nav.fileManager"), url: "/files", icon: <MuiFolderIcon className="size-6" /> },
    { title: t("nav.billing"), url: "/billing", icon: <AttachMoneyIcon className="size-6" /> },
    { title: t("nav.engagement"), url: "/engagement", icon: <HeartHandshakeIcon className="size-6" /> },
    { title: t("nav.inventory"), url: "/stocks", icon: <PackageIcon className="size-6" /> },
    { title: t("nav.reworks"), url: "/reworks", icon: <RotateCcwIcon className="size-6" /> },
    { title: t("nav.submissions"), url: "/submissions", icon: <SendIcon className="size-6" /> },
    { title: t("nav.addons"), url: "/addons", icon: <AddonsIcon className="size-6" /> },
    { title: t("nav.reports"), url: "/dashboard/reports", icon: <BarChart3Icon className="size-6" /> },
  ];

  const photographyItem: NavItem = {
    title: t("nav.photography"), url: "/photography", icon: <CameraAltIcon className="size-6" />,
  };

  const settingsItem: NavItem = {
    title: t("nav.settings"), url: "/settings", icon: <Settings2Icon className="size-6" />,
  };

  const role = user.role || "";
  const roleFilteredItems = filterNavByRole(platformItems, role);

  const visibleItems = [
    ...roleFilteredItems.filter((item) => !hiddenFeatures.includes(item.title)),
    ...(photographyInstalled && !hiddenFeatures.includes(t("nav.photography")) ? [photographyItem] : []),
  ];

  const settingsItems: NavItem[] = [settingsItem];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="h-20 border-b justify-center">
        <div className="flex items-center gap-2 px-1 group-data-[collapsible=icon]:justify-center">
          <Image src="/logo.jpeg" alt="MyWorkSpace Logo" width={32} height={32} className="size-8 rounded-full object-cover shadow-sm shrink-0" />
          <h1 className="text-lg font-bold truncate group-data-[collapsible=icon]:hidden">
            {t("app.name")}
          </h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={visibleItems} label={t("nav.dashboard")} />
        <NavMain items={settingsItems} label={t("nav.settings")} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
