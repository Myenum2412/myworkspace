"use client"

import * as React from "react"
import {

  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
  const pathname = usePathname() || ""
  const segments = pathname.split('/').filter(Boolean)
  const [status, setStatus] = React.useState<"Online" | "Offline" | "Break">("Online")

  const statusColors = {
    Online: "bg-emerald-500",
    Offline: "bg-gray-400",
    Break: "bg-amber-500",
  }

  const activeColor = statusColors[status]
  return (
    <header className="flex w-full h-20 shrink-0 border-b items-center justify-between px-4 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {segments.length === 0 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>Home</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join('/')}`
                const isLast = index === segments.length - 1
                const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

                return (
                  <React.Fragment key={href}>
                    <BreadcrumbItem className={!isLast ? "hidden md:block" : ""}>
                      {!isLast ? (
                        <BreadcrumbLink href={href}>{title}</BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{title}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
                  </React.Fragment>
                )
              })
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right Side Status & Date */}
      <div className="flex items-center gap-4 text-sm pr-2">
        <div className="hidden md:flex items-center gap-2 text-muted-foreground font-medium">
          <CalendarIcon className="size-4" />
          <time suppressHydrationWarning>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</time>
        </div>
        
        <Separator orientation="vertical" className="hidden md:block h-6" />

        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Badge variant="secondary" className="gap-2 w-24 h-9 justify-start px-3 text-sm font-normal cursor-pointer hover:bg-muted transition-colors">
              <span className="relative flex size-2">
                {status === "Online" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75"></span>}
                <span className={`relative inline-flex size-2 rounded-full ${activeColor}`}></span>
              </span>
              {status}
            </Badge>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatus("Online")}>
              <span className="flex size-2 rounded-full bg-emerald-500 mr-2"></span> Online
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus("Break")}>
              <span className="flex size-2 rounded-full bg-amber-500 mr-2"></span> Break
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatus("Offline")}>
              <span className="flex size-2 rounded-full bg-gray-400 mr-2"></span> Offline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
