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
  ReceiptIcon,
} from "lucide-react";

function buildClientNavData(t: (key: any) => string) {
  return [
    { title: t("nav.dashboard"), url: "/client/dashboard", icon: <LayoutDashboardIcon className="size-5" />, isActive: true },
    { title: t("nav.fileManager"), url: "/client/file-manager", icon: <FolderIcon className="size-5" /> },
    { title: t("nav.clientBills"), url: "/client/bills", icon: <ReceiptIcon className="size-5" /> },
  ];
}

interface NavUserData {
  name: string;
  email: string;
  avatar: string;
}

export function ClientSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUserData;
}) {
  const { data: session } = useSession();
  const { t } = useIndustry();
  const currentRole = (session?.user as Record<string, unknown>)?.role as string || "";
  if (currentRole !== ROLES.CLIENTS) {
    return null;
  }
  const navItems = buildClientNavData(t);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarBrand title={t("app.name")} subtitle="Client Portal" />
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
