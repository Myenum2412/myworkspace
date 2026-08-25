"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/search/global-search";
import { SessionTracker } from "@/components/session-tracker";
import { StaffStatusForm } from "@/components/staff-status-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useUserStatus } from "@/hooks/use-user-status";
import { type AppContextType, getAppContext } from "@/lib/app-context";
import { CalendarIcon, MenuOpenIcon, Search } from "@/lib/icons";
import { ROLES } from "@/lib/rbac";

const CONTEXT_LABELS: Record<AppContextType, string> = {
  origin: "Origin Menu",
  workspace: "Workspace",
  staff: "Staff Panel",
  public: "Public",
  client: "Client Portal",
};

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-500",
  online: "bg-green-500",
  busy: "bg-red-500",
  break: "bg-amber-500",
  meeting: "bg-purple-500",
  offline: "bg-gray-400",
  remote: "bg-blue-500",
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  online: "Available",
  busy: "Busy",
  break: "On Break",
  meeting: "In Meeting",
  offline: "Offline",
  remote: "Remote",
};

export function Header({ context }: { context?: AppContextType }) {
  const pathname = usePathname() || "";
  const appContext = context || getAppContext(pathname);
  const segments = useMemo(() => pathname.split("/").filter(Boolean), [pathname]);
  const { data: session } = useSession();
  const { status, updateStatus } = useUserStatus(session?.user?.id);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function handleStatusUpdateFromForm(newStatus: string) {
    const wsStatus = newStatus === "available" ? "online" : newStatus;
    updateStatus(wsStatus);
  }

  const { toggleSidebar } = useSidebar();
  const contextLabel = CONTEXT_LABELS[appContext];

  return (
    <header className="sticky top-0 z-30 flex w-full h-14 sm:h-16 md:h-20 shrink-0 border-b items-center justify-between gap-2 px-2 sm:px-3 md:px-4 transition-[width,height] ease-linear safe-paddings glass-surface">
      <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
        <Separator
          orientation="vertical"
          className="mr-1 sm:mr-2 data-vertical:h-4 data-vertical:self-auto hidden sm:block"
        />
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 touch-target-sm"
          aria-label="Toggle sidebar"
        >
          <MenuOpenIcon className="size-5" />
        </button>
        <Breadcrumb>
          <BreadcrumbList className="gap-0 sm:gap-1">
            {contextLabel && (
              <Fragment>
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbPage className="font-semibold text-foreground text-sm truncate max-w-[120px] sm:max-w-none">
                    {contextLabel}
                  </BreadcrumbPage>
                </BreadcrumbItem>
                {segments.length >= 1 && <BreadcrumbSeparator className="hidden md:block" />}
              </Fragment>
            )}
            {segments.length > 1 ? (
              segments.slice(1).map((segment, index) => {
                const href = `/${segments.slice(0, index + 2).join("/")}`;
                const isLast = index === segments.length - 2;
                const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
                return (
                  <Fragment key={href}>
                    <BreadcrumbItem
                      className={
                        !isLast ? "hidden md:block" : "truncate max-w-[100px] sm:max-w-[180px]"
                      }
                    >
                      {!isLast ? (
                        <BreadcrumbLink href={href} className="text-sm">
                          {title}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-sm truncate">{title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                  </Fragment>
                );
              })
            ) : segments.length === 1 ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm truncate max-w-[120px] sm:max-w-[200px]">
                  {segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " ")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm">{contextLabel || "Home"}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 text-sm pr-1 sm:pr-2 shrink-0">
        <NotificationBell />
        <button
          onClick={() => setSearchOpen(true)}
          className="flex md:hidden items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer touch-target"
          aria-label="Search"
        >
          <Search className="size-4" />
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-all cursor-pointer h-9 pl-3 pr-1.5 rounded-lg border bg-card/60 hover:bg-card border-border hover:border-ring/40 shadow-xs w-48 lg:w-56 group"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left text-sm">Search</span>
          <kbd className="rounded-md border bg-muted/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground group-hover:border-ring/40">
            ⌘K
          </kbd>
        </button>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        <div className="hidden lg:flex items-center gap-2 text-muted-foreground font-medium">
          <CalendarIcon className="size-4 shrink-0" />
          <time suppressHydrationWarning className="whitespace-nowrap text-xs">
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </time>
        </div>

        <ThemeToggle />

        <Separator orientation="vertical" className="hidden lg:block h-6" />

        <SessionTracker />

        {session?.user?.role === ROLES.STAFFS || session?.user?.role === ROLES.HR ? (
          <Popover>
            <PopoverTrigger asChild>
              <Badge
                variant="secondary"
                className="gap-1 sm:gap-2 min-w-0 h-8 sm:h-9 justify-start px-2 sm:px-3 text-xs sm:text-sm font-normal cursor-pointer hover:bg-muted transition-colors rounded-lg"
              >
                <span className="relative flex size-2 shrink-0">
                  {status === "online" && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-green-500 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex size-2 rounded-sm ${STATUS_COLORS[status] || "bg-gray-400"}`}
                  />
                </span>
                <span className="hidden sm:inline">
                  {STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </Badge>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-[280px] sm:w-[320px] p-0">
              <StaffStatusForm
                userId={session?.user?.id}
                onStatusUpdate={handleStatusUpdateFromForm}
              />
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </header>
  );
}
