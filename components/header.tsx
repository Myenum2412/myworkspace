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
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStatus } from "@/hooks/use-user-status";
import { Fragment } from "react";

export function Header() {
  const pathname = usePathname() || "";
  const segments = pathname.split("/").filter(Boolean);
  const { data: session } = useSession();
  const { status, updateStatus } = useUserStatus(session?.user?.id);

  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-gray-400",
    break: "bg-amber-500",
  };

  return (
    <header className="flex w-full h-20 shrink-0 border-b items-center justify-between px-4 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 data-vertical:h-4 data-vertical:self-auto" />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.length === 0 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>Home</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join("/")}`;
                const isLast = index === segments.length - 1;
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

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Badge
              variant="secondary"
              className="gap-2 w-24 h-9 justify-start px-3 text-sm font-normal cursor-pointer hover:bg-muted transition-colors"
            >
              <span className="relative flex size-2">
                {status === "online" && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
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
              <span className="flex size-2 rounded-full bg-emerald-500 mr-2" /> Online
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => updateStatus("break")}>
              <span className="flex size-2 rounded-full bg-amber-500 mr-2" /> Break
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
