"use client";

import {
  BellIcon,
  CheckCheckIcon,
  Loader2Icon,
  ArchiveIcon,
  Trash2Icon,
  ExternalLinkIcon,
  MessageSquareIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  CreditCardIcon,
  MegaphoneIcon,
  UsersIcon,
  FolderKanbanIcon,
  InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import Link from "next/link";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const categoryIcons: Record<string, React.ReactNode> = {
  tasks: <CheckCircle2Icon className="size-4 text-blue-500" />,
  projects: <FolderKanbanIcon className="size-4 text-violet-500" />,
  messages: <MessageSquareIcon className="size-4 text-green-500" />,
  billing: <CreditCardIcon className="size-4 text-amber-500" />,
  approvals: <AlertTriangleIcon className="size-4 text-orange-500" />,
  team: <UsersIcon className="size-4 text-cyan-500" />,
  system: <InfoIcon className="size-4 text-slate-500" />,
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  normal: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-slate-100 text-slate-800 border-slate-200",
};

export function NotificationBell() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
    loading,
    loadMore,
    hasMore,
  } = useNotifications(userId);

  const [open, setOpen] = useState(false);

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  const handleNotificationClick = useCallback(
    async (n: NotificationItem) => {
      if (!n.read) await markAsRead(n.id);
      if (n.link) {
        window.location.href = n.link;
      }
    },
    [markAsRead]
  );

  const handleAction = useCallback(
    async (e: React.MouseEvent, n: NotificationItem, action: NotificationItem["actions"][0]) => {
      e.stopPropagation();
      if (action.url) {
        window.location.href = action.url;
      }
    },
    []
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <BellIcon className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-96 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="link" size="sm" className="h-auto px-2 py-1 text-xs" asChild>
              <Link href="/notifications">View all</Link>
            </Button>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs gap-1" onClick={handleMarkAllRead}>
                <CheckCheckIcon className="size-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[480px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <BellIcon className="size-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
              <p className="text-xs mt-1">You&apos;ll see updates here when they arrive</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`relative transition-colors ${!n.read ? "bg-accent/20" : ""}`}
                >
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className="w-full text-left px-4 py-3 pr-12 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {categoryIcons[n.category] || <InfoIcon className="size-4 text-slate-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm leading-tight truncate ${!n.read ? "font-semibold" : "font-medium"}`}>
                            {n.title}
                          </p>
                          {n.priority === "urgent" && (
                            <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                          )}
                        </div>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</p>
                          {n.type && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                              {n.type.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </div>
                        {n.actions && n.actions.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                            {n.actions.slice(0, 2).map((a) => (
                              <Button
                                key={a.action}
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2 gap-1"
                                onClick={(e) => handleAction(e, n, a)}
                              >
                                {a.action === "view" || a.action === "reply" ? (
                                  <ExternalLinkIcon className="size-3" />
                                ) : a.action === "approve" ? (
                                  <CheckCircle2Icon className="size-3 text-green-500" />
                                ) : a.action === "reject" ? (
                                  <AlertTriangleIcon className="size-3 text-red-500" />
                                ) : null}
                                {a.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="absolute right-2 top-2 flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveNotification(n.id);
                      }}
                      className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                      title="Archive"
                    >
                      <ArchiveIcon className="size-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2Icon className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {hasMore && (
                <div className="px-4 py-2 text-center">
                  <Button variant="ghost" size="sm" className="text-xs" onClick={loadMore} disabled={loading}>
                    {loading ? <Loader2Icon className="size-3 animate-spin mr-1" /> : null}
                    Load more
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
