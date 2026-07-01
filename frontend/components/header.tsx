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
import { CalendarIcon } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStatus } from "@/hooks/use-user-status";
import { SessionTracker } from "@/components/session-tracker";
import { Fragment } from "react";
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

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    break: "bg-yellow-500",
  };

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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Badge
              variant="secondary"
              className="gap-2 w-24 h-9 justify-start px-3 text-sm font-normal cursor-pointer hover:bg-muted transition-colors"
            >
              <span className="relative flex size-2">
                {status === "online" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${statusColors[status]}`}
                />
              </span>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => updateStatus("online")}>
              <span className="flex size-2 rounded-full bg-green-500 mr-2" /> Online
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("break")}>
              <span className="flex size-2 rounded-full bg-yellow-500 mr-2" /> Break
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("offline")}>
              <span className="flex size-2 rounded-full bg-gray-400 mr-2" /> Offline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
