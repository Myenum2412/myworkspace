"use client"

import * as React from "react"
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import {
  RiCheckLine, RiErrorWarningLine, RiFileTextLine,
  RiGitMergeLine, RiMegaphoneLine, RiShieldCheckLine, RiUserAddLine,
  RiFileLine, RiLockLine, RiGlobalLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications"
import { useSession } from "next-auth/react"
import Link from "next/link"

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  auth: RiShieldCheckLine,
  tasks: RiFileTextLine,
  projects: RiGitMergeLine,
  files: RiFileLine,
  approvals: RiErrorWarningLine,
  permissions: RiLockLine,
  hr: RiUserAddLine,
  clients: RiUserAddLine,
  messages: RiMegaphoneLine,
  billing: RiFileTextLine,
  security: RiShieldCheckLine,
  system: RiShieldCheckLine,
  team: RiUserAddLine,
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-primary",
  low: "bg-slate-300",
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} Min Ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} Hour${hrs > 1 ? "s" : ""} Ago`
  const days = Math.floor(hrs / 24)
  return `${days} Day${days > 1 ? "s" : ""} Ago`
}

export function NotificationBell() {
  const { data: session } = useSession()
  const userId = session?.user?.id
  const {
    notifications, unreadCount, markAsRead, markAllAsRead,
    archiveNotification, deleteNotification, loading, loadMore, hasMore,
  } = useNotifications(userId)

  const handleMarkAllRead = React.useCallback(() => {
    markAllAsRead()
  }, [markAllAsRead])

  const handleNotificationClick = React.useCallback(
    async (n: NotificationItem) => {
      if (!n.read) await markAsRead(n.id)
      if (n.link) window.location.href = n.link
    },
    [markAsRead]
  )

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9" aria-label="Open notifications">
          <NotificationsActiveIcon className="size-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] h-4 items-center justify-center bg-primary text-[10px] font-semibold text-primary-foreground px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full p-0 sm:max-w-md">
        <SheetHeader className="flex-row items-center gap-2 space-y-0 pr-12">
          <SheetTitle className="flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="flex size-5 items-center justify-center bg-primary text-[10px] font-semibold text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </SheetTitle>
          <Link href="/notifications" className="ml-auto text-xs text-primary hover:underline">
            View All
          </Link>
        </SheetHeader>

        <Separator />

        <ScrollArea className="flex-1 [&_[data-slot=scroll-area-viewport]]:scroll-fade-y">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <div className="size-5 animate-spin rounded-sm border-2 border-muted border-t-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <NotificationsActiveIcon className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You&apos;ll see updates here when they arrive</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {notifications.slice(0, 20).map((item, index) => {
                const Icon = categoryIcons[item.category] || NotificationsActiveIcon
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 relative",
                        !item.read && "bg-muted/30"
                      )}
                    >
                      {/* Priority indicator */}
                      <span
                        className={cn(
                          "absolute left-0 top-0 bottom-0 w-0.5",
                          priorityColors[item.priority] || "bg-transparent"
                        )}
                      />

                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center bg-muted text-muted-foreground",
                          !item.read && "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-xs font-medium",
                              !item.read ? "text-foreground" : "text-muted-foreground"
                            )}
                          >
                            {item.title}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        {item.message && (
                          <p className="text-xs/relaxed text-muted-foreground line-clamp-2">
                            {item.message}
                          </p>
                        )}

                        {item.actions && item.actions.length > 0 && (
                          <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                            {item.actions.slice(0, 2).map((a) => (
                              <span key={a.action}
                                onClick={() => { if (a.url) window.location.href = a.url; }}
                                className="text-[10px] text-primary font-medium hover:underline cursor-pointer"
                              >
                                {a.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {!item.read && (
                        <span className="mt-1.5 size-1.5 shrink-0 bg-primary rounded-sm" aria-label="Unread" />
                      )}
                    </button>
                    {index < notifications.length - 1 && index < 19 && <Separator />}
                  </li>
                )
              })}
              {hasMore && (
                <div className="px-4 py-2 text-center">
                  <Link href="/notifications">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View all notifications
                    </Button>
                  </Link>
                </div>
              )}
            </ul>
          )}
        </ScrollArea>

        <Separator />

        <div className="flex gap-2 p-3">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="flex-1">
              Close
            </Button>
          </SheetClose>
          <Button
            size="sm"
            className="flex-1"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            <RiCheckLine className="size-3.5 mr-1" />
            Mark All Read
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
