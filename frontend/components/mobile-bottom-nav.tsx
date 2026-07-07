"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboardIcon,
  ListChecksIcon,
  ClockIcon,
  FolderIcon,
  UsersIcon,
  BriefcaseIcon,
  Building2Icon,
  BellIcon,
  ListTodoIcon,
  ReceiptIcon,
  Settings2Icon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const workspaceNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/mytasks", label: "Tasks", icon: ListChecksIcon },
  { href: "/time-tracker", label: "Time", icon: ClockIcon },
  { href: "/employees", label: "Team", icon: UsersIcon },
  { href: "/billing/invoices", label: "Invoices", icon: ReceiptIcon },
];

const staffNav: NavItem[] = [
  { href: "/staffs", label: "Home", icon: LayoutDashboardIcon },
  { href: "/staffs/tasks", label: "Tasks", icon: ListTodoIcon },
  { href: "/staffs/timesheet", label: "Time", icon: ClockIcon },
  { href: "/staffs/files", label: "Files", icon: FolderIcon },
  { href: "/staffs/settings", label: "Settings", icon: Settings2Icon },
];

const clientNav: NavItem[] = [
  { href: "/client/dashboard", label: "Home", icon: LayoutDashboardIcon },
  { href: "/client/projects", label: "Projects", icon: BriefcaseIcon },
  { href: "/client/file-manager", label: "Files", icon: FolderIcon },
  { href: "/client/notifications", label: "Alerts", icon: BellIcon },
];

const orgNav: NavItem[] = [
  { href: "/orgmenu", label: "Home", icon: LayoutDashboardIcon },
  { href: "/orgmenu/members", label: "Members", icon: UsersIcon },
  { href: "/orgmenu/org", label: "Org", icon: Building2Icon },
  { href: "/orgmenu/reports", label: "Reports", icon: BriefcaseIcon },
  { href: "/orgmenu/settings", label: "Settings", icon: Settings2Icon },
];

export function MobileBottomNav({ context }: { context?: string }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  let navItems: NavItem[] = [];
  if (context === "origin") navItems = orgNav;
  else if (context === "staff") navItems = staffNav;
  else if (context === "client") navItems = clientNav;
  else navItems = workspaceNav;

  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background safe-bottom md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 h-full rounded-md transition-colors",
                "touch-target",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-[10px] leading-tight font-medium truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
