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
import FolderIcon from "@mui/icons-material/Folder";
import {
  LayoutDashboardIcon,
  ReceiptIcon,
} from "lucide-react";

function buildClientNavData(orgId: string) {
  return [
    {
      title: "Dashboard",
      url: "/client/dashboard",
      icon: <LayoutDashboardIcon className="size-6" />,
      isActive: true,
    },
    {
      title: "File Management",
      url: "/client/file-manager",
      icon: <FolderIcon className="size-6" />,
    },
    {
      title: "Bills",
      url: "/client/bills",
      icon: <ReceiptIcon className="size-6" />,
    },
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
  const orgId = (session?.user as Record<string, unknown>)?.orgId as string || "";
  const navItems = buildClientNavData(orgId);

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
            Client Portal
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
