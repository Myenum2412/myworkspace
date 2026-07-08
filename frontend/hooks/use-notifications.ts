"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocketIO } from "@/lib/socketio-client";
import { useNotificationPermission } from "./use-notification-permission";
import { subscribeToPush } from "@/lib/push-subscription";

export interface NotificationAction {
  label: string;
  action: string;
  url?: string;
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
  read: boolean;
  readAt?: string;
  archived?: boolean;
  link?: string;
  actions: NotificationAction[];
  createdAt: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { permission, requestPermission } = useNotificationPermission();
  const notifiedRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async (reset = false) => {
    if (!userId) return;
    setLoading(true);
    try {
      const currentOffset = reset ? 0 : offset;
      const res = await fetch(
        `/api/notifications?limit=50&offset=${currentOffset}&_=${Date.now()}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const d = await res.json();
        const list: NotificationItem[] = (d.notifications || []).map((n: any) => ({
          ...n,
          id: n.id || n._id,
        }));
        if (reset) {
          setNotifications(list);
          setOffset(list.length);
        } else {
          setNotifications((prev) => {
            const existing = new Map(prev.map((n) => [n.id, n]));
            for (const n of list) existing.set(n.id, n);
            return Array.from(existing.values());
          });
          setOffset((o) => o + list.length);
        }
        setHasMore(list.length >= 50);
        setTotal(d.total || list.length);
        setUnreadCount(d.unread ?? list.filter((n: NotificationItem) => !n.read).length);
      }
    } catch {}
    setLoading(false);
  }, [userId, offset]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;
    fetchNotifications(true);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.IO real-time listener
  useEffect(() => {
    if (!userId) return;

    const socket = getSocketIO();
    const handler = async (raw: any) => {
      const n: Record<string, any> = raw?.payload || raw;
      const id = n.id || n._id;
      if (!id) return;
      const notif = { ...n, id } as NotificationItem;

      setNotifications((prev) => {
        const exists = prev.some((n) => n.id === notif.id);
        if (exists) return prev;
        return [notif, ...prev];
      });
      if (!notif.read) setUnreadCount((c) => c + 1);

      // Show browser notification if supported and permission granted
      if (!notif.read && "Notification" in window && Notification.permission === "granted") {
        if (!notifiedRef.current.has(notif.id)) {
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
          } catch (err) {
            // Fallback to simple notification if service worker not ready
            try {
              const n = new Notification(notif.title, {
                body: notif.message,
                icon: notif.icon || "/web-app-manifest-192x192.png",
                tag: `notification:${notif.id}`,
              });
              n.onclick = () => {
                if (notif.link) window.open(notif.link, "_self");
              };
            } catch {}
          }
        }
      }
    };

    socket.on("notification", handler);
    return () => {
      socket.off("notification", handler);
    };
  }, [userId]);

  // Auto-subscribe to push on first load if permission granted
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
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const archiveNotification = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/archive`, { method: "POST", credentials: "include" });
    } catch {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE", credentials: "include" });
    } catch {}
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false);
    }
  }, [loading, hasMore, fetchNotifications]);

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
    requestPermission,
  };
}
