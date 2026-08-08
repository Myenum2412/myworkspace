"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useIndustry } from "@/components/industry-provider";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Building2Icon,
  ClockIcon,
  FolderIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  ListTodoIcon,
  type LucideIcon,
  ReceiptIcon,
  Settings2Icon,
  UsersIcon,
} from "@/lib/icons";
import { isAdminRole, ROLES } from "@/lib/rbac";
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
  { href: "/staffs/settings", label: "Settings", icon: Settings2Icon },
];

const clientNav: NavItem[] = [
  { href: "/client/dashboard", label: "Home", icon: LayoutDashboardIcon },
  { href: "/client/bills", label: "Bills", icon: ReceiptIcon },
];

const orgNav: NavItem[] = [
  { href: "/orgmenu", label: "Home", icon: LayoutDashboardIcon },
  { href: "/orgmenu/members", label: "Members", icon: UsersIcon },
  { href: "/orgmenu/org", label: "Org", icon: Building2Icon },
  { href: "/orgmenu/settings", label: "Settings", icon: Settings2Icon },
];

export function MobileBottomNav({ context }: { context?: string }) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { data: session } = useSession();
  const { t } = useIndustry();
  const role = ((session?.user as Record<string, unknown>)?.role as string) || "";

  let navItems: NavItem[] = [];
  if (context === "origin") navItems = orgNav;
  else if (context === "staff") navItems = staffNav;
  else if (context === "client") navItems = clientNav;
  else {
    navItems = workspaceNav.filter((item) => {
      if (isAdminRole(role)) return true;
      if (item.href === "/billing/invoices" || item.href === "/employees") {
        return false;
      }
      return true;
    });
  }

  if (!isMobile) return null;

  const labelMap: Record<string, string> = {
    Dashboard: t("nav.dashboard"),
    Tasks: t("nav.tasks"),
    Time: t("nav.time"),
    Team: t("nav.team"),
    Invoices: t("nav.invoices"),
    Home: t("nav.dashboard"),
    Bills: t("nav.invoices"),
    Members: t("nav.members"),
    Org: t("nav.organization"),
    Settings: t("nav.settings"),
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t bg-sidebar safe-bottom md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-0 flex-1 h-full rounded-xl transition-colors",
                "touch-target",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon
                className={cn("size-5 shrink-0 transition-transform", isActive && "scale-110")}
              />
              <span className="text-[10px] leading-tight font-medium truncate max-w-full">
                {labelMap[item.label] || item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
