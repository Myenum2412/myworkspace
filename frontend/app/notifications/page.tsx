"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BellIcon,
  CheckCheckIcon,
  ArchiveIcon,
  Trash2Icon,
  Loader2Icon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MessageSquareIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  CreditCardIcon,
  UsersIcon,
  FolderKanbanIcon,
  InfoIcon,
  ExternalLinkIcon,
  FilterIcon,
  MegaphoneIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { useSession } from "next-auth/react";

const categoryIcons: Record<string, React.ReactNode> = {
  tasks: <CheckCircle2Icon className="size-4 text-blue-500" />,
  projects: <FolderKanbanIcon className="size-4 text-violet-500" />,
  messages: <MessageSquareIcon className="size-4 text-green-500" />,
  billing: <CreditCardIcon className="size-4 text-amber-500" />,
  approvals: <AlertTriangleIcon className="size-4 text-orange-500" />,
  team: <UsersIcon className="size-4 text-cyan-500" />,
  system: <InfoIcon className="size-4 text-slate-500" />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 24 * 60 * 60 * 1000) return timeAgo(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const CATEGORIES = ["all", "tasks", "projects", "messages", "billing", "approvals", "team", "system"];

export default function NotificationsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const {
    notifications,
    unreadCount,
    total,
    loading,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
  } = useNotifications(userId);
  const [filterCategory, setFilterCategory] = useState("all");

  const filtered = filterCategory === "all"
    ? notifications
    : notifications.filter((n) => n.category === filterCategory);

  const handleNotificationClick = useCallback(
    async (n: NotificationItem) => {
      if (!n.read) await markAsRead(n.id);
      if (n.link) window.location.href = n.link;
    },
    [markAsRead]
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} total{unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheckIcon className="size-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <FilterIcon className="size-4 text-muted-foreground" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="capitalize">
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notification List */}
      <div className="flex-1">
        {loading && filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellIcon className="size-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">
              {filterCategory !== "all"
                ? `No ${filterCategory} notifications yet`
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`group relative flex items-start gap-4 rounded-lg border p-4 transition-colors cursor-pointer hover:bg-accent/30 ${
                  !n.read ? "bg-accent/20 border-accent" : "bg-card"
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                {/* Icon */}
                <div className="mt-0.5 shrink-0">
                  {categoryIcons[n.category] || <InfoIcon className="size-5 text-slate-400" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          !n.read ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                      )}
                      {n.priority === "urgent" && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">
                          URGENT
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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

                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {n.message}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDate(n.createdAt)}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                      {n.category}
                    </Badge>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                      {n.type.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  {n.actions && n.actions.length > 0 && (
                    <div
                      className="flex items-center gap-1.5 mt-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {n.actions.map((a) => (
                        <Button
                          key={a.action}
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] px-2 gap-1"
                          onClick={() => {
                            if (a.url) window.location.href = a.url;
                          }}
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

                {/* Timestamp for desktop */}
                <div className="hidden sm:block shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={loading} className="gap-1.5">
                  {loading && <Loader2Icon className="size-3 animate-spin" />}
                  Load more notifications
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
