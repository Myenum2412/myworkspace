"use client";

import { useSession } from "next-auth/react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Search } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { usePathname } from "next/navigation";
import { useUserStatus } from "@/hooks/use-user-status";
import { SessionTracker } from "@/components/session-tracker";
import { GlobalSearch } from "@/components/search/global-search";
import { StaffStatusForm } from "@/components/staff-status-form";
import { Fragment, useEffect, useState } from "react";
import { getAppContext, type AppContextType } from "@/lib/app-context";

const CONTEXT_LABELS: Record<AppContextType, string> = {
  origin: "Origin Menu",
  workspace: "Workspace",
  staff: "Staff Panel",
  public: "",
};

export function Header({ context }: { context?: AppContextType }) {
  const pathname = usePathname() || "";
  const appContext = context || getAppContext(pathname);
  const segments = pathname.split("/").filter(Boolean);
  const { data: session } = useSession();
  const { status, updateStatus } = useUserStatus(session?.user?.id);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const statusColors: Record<string, string> = {
    available: "bg-green-500",
    online: "bg-green-500",
    busy: "bg-red-500",
    break: "bg-amber-500",
    meeting: "bg-purple-500",
    offline: "bg-gray-400",
    remote: "bg-blue-500",
  };

  const statusLabels: Record<string, string> = {
    available: "Available",
    online: "Available",
    busy: "Busy",
    break: "On Break",
    meeting: "In Meeting",
    offline: "Offline",
    remote: "Remote",
  };

  function handleStatusUpdateFromForm(newStatus: string) {
    const wsStatus = newStatus === "available" ? "online" : newStatus === "remote" || newStatus === "busy" || newStatus === "meeting" ? "online" : newStatus;
    if (["online", "offline", "break"].includes(wsStatus)) {
      updateStatus(wsStatus as "online" | "offline" | "break");
    } else {
      updateStatus("online");
    }
  }

  const contextLabel = CONTEXT_LABELS[appContext];

  return (
    <header className="flex w-full h-20 shrink-0 border-b items-center justify-between px-4 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb>
          <BreadcrumbList>
            {contextLabel && (
              <Fragment>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold text-foreground">
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
                    <BreadcrumbItem className={!isLast ? "hidden md:block" : ""}>
                      {!isLast ? (
                        <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                  </Fragment>
                );
              })
            ) : segments.length === 1 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, " ")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{contextLabel || "Home"}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center gap-4 text-sm pr-2">
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Search className="size-4" />
          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
        </button>

        <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

        <div className="hidden md:flex items-center gap-2 text-muted-foreground font-medium">
          <CalendarIcon className="size-4" />
          <time suppressHydrationWarning>
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </time>
        </div>

        <Separator orientation="vertical" className="hidden md:block h-6" />

        <NotificationBell />

        <SessionTracker />

        <Popover>
          <PopoverTrigger asChild>
            <Badge
              variant="secondary"
              className="gap-2 min-w-[100px] h-9 justify-start px-3 text-sm font-normal cursor-pointer hover:bg-muted transition-colors"
            >
              <span className="relative flex size-2">
                {status === "online" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${statusColors[status] || "bg-gray-400"}`}
                />
              </span>
              {statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-[320px] p-0">
            <StaffStatusForm
              userId={session?.user?.id}
              onStatusUpdate={handleStatusUpdateFromForm}
            />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
