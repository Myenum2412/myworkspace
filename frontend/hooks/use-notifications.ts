"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocketIO } from "@/lib/socketio-client";

interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message?: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    fetchNotifications(userId).then(setNotifications);

    const socket = getSocketIO();
    const handler = (data: any) => {
      const notif = data?.payload || data;
      if (notif.userId === userId || !notif.userId) {
        setNotifications((prev) => {
          const exists = prev.some((n) => n.id === notif.id);
          if (exists) return prev;
          return [{ ...notif, id: notif.id || notif._id }, ...prev];
        });
        if (!notif.read) setUnreadCount((c) => c + 1);
      }
    };

    socket.on("notification", handler);
    return () => { socket.off("notification", handler); };
  }, [userId]);

  useEffect(() => {
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [notifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "POST", credentials: "include" });
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}

async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const res = await fetch(`/api/notifications?userId=${userId}`, { credentials: "include" });
    if (res.ok) {
      const d = await res.json();
      const list = d.data || d || [];
      return list.map((n: any) => ({
        ...n,
        id: n.id || n._id,
      }));
    }
  } catch {}
  return [];
}
