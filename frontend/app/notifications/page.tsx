"use client";

import { useState, useCallback, useEffect } from "react";
import {
  BellIcon, CheckCheckIcon, ArchiveIcon, Trash2Icon, Loader2Icon,
  SearchIcon, FilterIcon, ClockIcon, ArrowUpIcon, ArrowDownIcon,
  MessageSquareIcon, CheckCircle2Icon, AlertTriangleIcon, CreditCardIcon,
  UsersIcon, FolderKanbanIcon, InfoIcon, ExternalLinkIcon, MegaphoneIcon,
  FileIcon, ShieldIcon, UserPlusIcon, LockIcon, SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications, type NotificationItem } from "@/hooks/use-notifications";
import { useSession } from "next-auth/react";
import Link from "next/link";

const categoryIcons: Record<string, React.ReactNode> = {
  auth: <ShieldIcon className="size-4 text-purple-500" />,
  tasks: <CheckCircle2Icon className="size-4 text-blue-500" />,
  projects: <FolderKanbanIcon className="size-4 text-violet-500" />,
  files: <FileIcon className="size-4 text-amber-500" />,
  approvals: <AlertTriangleIcon className="size-4 text-orange-500" />,
  permissions: <LockIcon className="size-4 text-red-500" />,
  hr: <UsersIcon className="size-4 text-cyan-500" />,
  clients: <UserPlusIcon className="size-4 text-green-500" />,
  messages: <MessageSquareIcon className="size-4 text-green-500" />,
  billing: <CreditCardIcon className="size-4 text-amber-500" />,
  security: <ShieldIcon className="size-4 text-red-500" />,
  system: <InfoIcon className="size-4 text-slate-500" />,
  team: <UsersIcon className="size-4 text-cyan-500" />,
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  low: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
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
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const CATEGORIES = ["all", "auth", "tasks", "projects", "files", "approvals", "permissions", "hr", "clients", "messages", "billing", "security", "system", "team"];
const PRIORITIES = ["all", "critical", "high", "medium", "low"];

export default function NotificationsPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const {
    notifications, unreadCount, total, loading, hasMore, loadMore,
    markAsRead, markAllAsRead, archiveNotification, deleteNotification,
    bulkArchive, bulkDelete, snoozeNotification, refresh,
  } = useNotifications(userId);

  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const filtered = notifications.filter((n) => {
    if (filterCategory !== "all" && n.category !== filterCategory) return false;
    if (filterPriority !== "all" && n.priority !== filterPriority) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!n.title.toLowerCase().includes(q) && !(n.message || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleNotificationClick = useCallback(
    async (n: NotificationItem) => {
      if (selectMode) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(n.id)) next.delete(n.id);
          else next.add(n.id);
          return next;
        });
        return;
      }
      if (!n.read) await markAsRead(n.id);
      if (n.link) window.location.href = n.link;
    },
    [markAsRead, selectMode]
  );

  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
  };

  const handleBulkArchive = async () => {
    await bulkArchive(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    await bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} total{unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectMode && selectedIds.size > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={handleBulkArchive} className="gap-1.5">
                <ArchiveIcon className="size-4" />
                Archive ({selectedIds.size})
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkDelete} className="gap-1.5 text-destructive">
                <Trash2Icon className="size-4" />
                Delete ({selectedIds.size})
              </Button>
            </>
          )}
          <Button variant={selectMode ? "default" : "outline"} size="sm" onClick={toggleSelectMode} className="gap-1.5">
            {selectMode ? "Cancel" : "Select"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5">
              <CheckCheckIcon className="size-4" />
              Mark all read
            </Button>
          )}
          <Link href="/settings/notifications">
            <Button variant="ghost" size="icon" className="size-8">
              <SettingsIcon className="size-4" />
            </Button>
          </Link>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <SearchIcon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <FilterIcon className="size-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat} className="capitalize">
                  {cat === "all" ? "All Categories" : cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p === "all" ? "All Priorities" : p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1">
        {loading && filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BellIcon className="size-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">No notifications</p>
            <p className="text-xs mt-1">
              {searchQuery ? "No results for your search" : filterCategory !== "all" ? `No ${filterCategory} notifications` : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`group relative flex items-start gap-4 rounded-lg border p-4 transition-colors cursor-pointer ${
                  selectMode
                    ? selectedIds.has(n.id) ? "ring-2 ring-primary bg-accent/50" : "hover:bg-accent/20"
                    : !n.read ? "bg-accent/20 border-accent hover:bg-accent/30" : "bg-card hover:bg-accent/20"
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                {selectMode && (
                  <div className="mt-1 shrink-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(n.id)}
                      onChange={() => {}}
                      className="size-4"
                    />
                  </div>
                )}

                <div className="mt-0.5 shrink-0">
                  {categoryIcons[n.category] || <InfoIcon className="size-5 text-slate-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`text-sm truncate ${!n.read ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      {!n.read && <span className="size-2 shrink-0 rounded-full bg-blue-500" />}
                      {n.priority === "critical" && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">CRITICAL</Badge>
                      )}
                    </div>
                    {!selectMode && (
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button onClick={(e) => e.stopPropagation()}
                              className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors" title="Snooze">
                              <ClockIcon className="size-3.5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-28 p-1" align="end">
                            <button onClick={(e) => { e.stopPropagation(); snoozeNotification(n.id, new Date(Date.now() + 3600000)).catch(() => {}); }}
                              className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm">Snooze 1h</button>
                            <button onClick={(e) => { e.stopPropagation(); snoozeNotification(n.id, new Date(Date.now() + 14400000)).catch(() => {}); }}
                              className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm">Snooze 4h</button>
                            <button onClick={(e) => { e.stopPropagation(); snoozeNotification(n.id, new Date(Date.now() + 86400000)).catch(() => {}); }}
                              className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded-sm">Snooze 24h</button>
                          </PopoverContent>
                        </Popover>
                        <button onClick={(e) => { e.stopPropagation(); archiveNotification(n.id); }}
                          className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors" title="Archive">
                          <ArchiveIcon className="size-3.5" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors" title="Delete">
                          <Trash2Icon className="size-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {n.message && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  )}

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/60">{formatDate(n.createdAt)}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{n.category}</Badge>
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{n.type.replace(/_/g, " ")}</Badge>
                    {n.priority !== "medium" && (
                      <Badge className={`text-[9px] px-1 py-0 ${priorityColors[n.priority] || ""}`}>
                        {n.priority}
                      </Badge>
                    )}
                  </div>

                  {n.actions && n.actions.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      {n.actions.map((a) => (
                        <Button key={a.action}
                          variant={a.primary ? "default" : "outline"}
                          size="sm" className="h-7 text-[11px] px-2 gap-1"
                          onClick={() => { if (a.url) window.location.href = a.url; }}>
                          <ExternalLinkIcon className="size-3" />
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="hidden sm:block shrink-0 text-right">
                  <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            ))}

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
