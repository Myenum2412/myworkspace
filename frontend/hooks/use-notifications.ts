"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocketIO } from "@/lib/socketio-client";
import { useNotificationPermission } from "./use-notification-permission";
import { subscribeToPush } from "@/lib/push-subscription";
import { useNotificationStore } from "../stores/notification-store";

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
  icon?: string;
  primary?: boolean;
}

export interface NotificationItem {
  id: string;
  userId: string;
  orgId?: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  message?: string;
  icon?: string;
  avatar?: string;
  read: boolean;
  readAt?: string;
  archived?: boolean;
  archivedAt?: string;
  snoozedUntil?: string;
  link?: string;
  deepLink?: string;
  actions: NotificationAction[];
  channels?: string[];
  source?: string;
  correlationId?: string;
  createdAt: string;
}

const NOTIFIED_MAX_SIZE = 200;

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const offsetRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const store = useNotificationStore();
  const { permission, requestPermission } = useNotificationPermission();
  const notifiedRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchNotifications = useCallback(async (reset = false, signal?: AbortSignal, filters?: Record<string, string>) => {
    if (!userIdRef.current) return;
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offsetRef.current;
      const params = new URLSearchParams({
        limit: "50",
        offset: String(currentOffset),
        ...(filters?.category && { category: filters.category }),
        ...(filters?.type && { type: filters.type }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.search && { search: filters.search }),
        ...(filters?.startDate && { startDate: filters.startDate }),
        ...(filters?.endDate && { endDate: filters.endDate }),
        ...(filters?.unreadOnly === "true" && { unreadOnly: "true" }),
        ...(filters?.archived === "true" && { archived: "true" }),
      });
      const res = await fetch(`/api/notifications?${params}`, { credentials: "include", signal });
      if (res.ok) {
        const d = await res.json();
        const list: NotificationItem[] = (d.notifications || []).map((n: any) => ({
          ...n,
          id: n.id || n._id,
        }));
        if (reset) {
          setNotifications(list);
          store.setNotifications(list);
          offsetRef.current = list.length;
        } else {
          const current = useNotificationStore.getState().notifications;
          const map = new Map(current.map((n) => [n.id, n]));
          for (const n of list) map.set(n.id, n);
          const merged = Array.from(map.values());
          setNotifications(merged);
          store.setNotifications(merged);
          offsetRef.current += list.length;
        }
        setHasMore(list.length >= 50);
        setTotal(d.total || list.length);
        const unread = d.unread ?? list.filter((n: NotificationItem) => !n.read).length;
        setUnreadCount(unread);
        store.setUnreadCount(unread);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    fetchNotifications(true, controller.signal);
    return () => controller.abort();
  }, [userId, fetchNotifications]);

  // Socket.IO real-time listener
  useEffect(() => {
    if (!userId) return;

    const socket = getSocketIO();
    const handler = async (raw: any) => {
      const n: Record<string, any> = raw?.payload || raw;
      const id = n.id || n._id;
      if (!id) return;
      const notif = { ...n, id } as NotificationItem;

      store.addNotification(notif);
      setNotifications((prev) => {
        if (prev.some((existing) => existing.id === notif.id)) return prev;
        return [notif, ...prev];
      });
      if (!notif.read) setUnreadCount((c) => c + 1);

      if (!notif.read && "Notification" in window && Notification.permission === "granted") {
        if (!notifiedRef.current.has(notif.id)) {
          if (notifiedRef.current.size >= NOTIFIED_MAX_SIZE) {
            const first = notifiedRef.current.values().next().value;
            if (first) notifiedRef.current.delete(first);
          }
          notifiedRef.current.add(notif.id);

          try {
            const sw = await navigator.serviceWorker.ready;
            sw.showNotification(notif.title, {
              body: notif.message,
              icon: notif.icon || "/web-app-manifest-192x192.png",
              badge: "/web-app-manifest-192x192.png",
              tag: `notification:${notif.id}`,
              data: { link: notif.link, id: notif.id, actions: notif.actions } as any,
              actions: notif.actions?.map((a) => ({
                action: a.action,
                title: a.label,
              })),
              vibrate: [200, 100, 200],
            } as any);
          } catch {
            try {
              const notification = new Notification(notif.title, {
                body: notif.message,
                icon: notif.icon || "/web-app-manifest-192x192.png",
                tag: `notification:${notif.id}`,
              });
              notification.onclick = () => {
                if (notif.link) window.open(notif.link, "_self");
              };
            } catch {}
          }
        }
      }

      // Update unread count via unread_count event if available
      const unreadEvent = raw?.unreadCount;
      if (typeof unreadEvent === "number") {
        setUnreadCount(unreadEvent);
      }
    };

    socket.on("notification", handler);
    socket.on("unread_count", (data: any) => {
      if (typeof data?.count === "number") {
        setUnreadCount(data.count);
        store.setUnreadCount(data.count);
      }
    });

    return () => {
      socket.off("notification", handler);
      socket.off("unread_count");
    };
  }, [userId]);

  useEffect(() => {
    if (permission === "granted" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => subscribeToPush(reg))
        .catch(() => {});
    }
  }, [permission]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
    } catch {}
    store.updateNotification(id, { read: true });
    store.decrementUnread();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    } catch {}
    store.setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const archiveNotification = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/archive`, { method: "POST", credentials: "include" });
    } catch {}
    store.removeNotification(id);
    store.decrementUnread();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE", credentials: "include" });
    } catch {}
    store.removeNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const bulkArchive = useCallback(async (ids: string[]) => {
    try {
      await fetch("/api/notifications/bulk-archive", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {}
    for (const id of ids) store.removeNotification(id);
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
  }, []);

  const bulkDelete = useCallback(async (ids: string[]) => {
    try {
      await fetch("/api/notifications/bulk-delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {}
    for (const id of ids) store.removeNotification(id);
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
  }, []);

  const snoozeNotification = useCallback(async (id: string, until: Date) => {
    try {
      await fetch(`/api/notifications/${id}/snooze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ until: until.toISOString() }),
      });
    } catch {}
    store.updateNotification(id, { snoozedUntil: until.toISOString() });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, snoozedUntil: until.toISOString() } : n))
    );
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false);
    }
  }, [loading, hasMore, fetchNotifications]);

  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetchNotifications(true);
  }, [fetchNotifications]);

  return {
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
    bulkArchive,
    bulkDelete,
    snoozeNotification,
    refresh,
    requestPermission,
  };
}
